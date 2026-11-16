import { describe, it, expect } from 'vitest';
import { orgContext } from '../../src/lib/org-context';

/**
 * Unit tests for the orgContext request module (issue #3). These use a minimal
 * fake Hono Context — orgContext only touches c.get('jwtPayload'), c.env.DB and
 * c.json(). End-to-end query scoping is exercised in the people-route
 * integration test.
 */
type FakeResponse = { __status: number; __body: unknown };

function makeContext(jwtPayload: unknown) {
  return {
    get: (key: string) => (key === 'jwtPayload' ? jwtPayload : undefined),
    env: { DB: {} as D1Database },
    json: (body: unknown, status = 200): FakeResponse => ({ __status: status, __body: body }),
  } as any;
}

const validPayload = {
  sub: 'user-1',
  email: 'a@b.local',
  orgId: 'org-1',
  role: 'core_admin',
  permissions: ['people.view', 'people.edit'],
  exp: Math.floor(Date.now() / 1000) + 3600,
};

describe('orgContext (issue #3)', () => {
  it('returns 403 when the caller lacks the required permission', () => {
    const c = makeContext({ ...validPayload, permissions: ['people.view'] });
    const result = orgContext(c, 'people.edit') as FakeResponse;
    expect(result.__status).toBe(403);
    expect(result.__body).toEqual({ error: 'Forbidden' });
  });

  it('returns 401 when the JWT payload is missing an orgId', () => {
    const c = makeContext({ ...validPayload, orgId: undefined });
    const result = orgContext(c, 'people.view') as FakeResponse;
    expect(result.__status).toBe(401);
  });

  it('returns 401 when there is no JWT payload at all', () => {
    const c = makeContext(undefined);
    const result = orgContext(c, 'people.view') as FakeResponse;
    expect(result.__status).toBe(401);
  });

  it('returns a context bound to the caller org when authorized', () => {
    const c = makeContext(validPayload);
    const result = orgContext(c, 'people.edit');
    // A successful call returns the context object, not a json() response.
    expect('__status' in (result as object)).toBe(false);
    if ('__status' in (result as object)) return;
    expect(result.orgId).toBe('org-1');
    expect(result.payload).toBe(validPayload);
    expect(typeof result.scoped).toBe('function');
  });
});
