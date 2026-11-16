import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/auth';

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const stored = await hashPassword('correct horse');
    expect(await verifyPassword('correct horse', stored)).toBe(true);
    expect(await verifyPassword('correct hors', stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('rejects malformed stored values', async () => {
    expect(await verifyPassword('x', '')).toBe(false);
    expect(await verifyPassword('x', 'no-separator')).toBe(false);
  });

  it('never matches the dummy hash used for unknown users', async () => {
    const dummy = 'AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    expect(await verifyPassword('', dummy)).toBe(false);
    expect(await verifyPassword('anything', dummy)).toBe(false);
  });
});
