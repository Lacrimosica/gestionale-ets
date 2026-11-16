import { describe, it, expect } from 'vitest';
import { decodeGoogleIdToken, rejectGoogleIdentity } from '../../src/lib/google-identity';

function fakeIdToken(claims: Record<string, unknown>) {
  const b64url = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'RS256' })}.${b64url(claims)}.sig`;
}

describe('Google identity checks', () => {
  it('decodes base64url claims', () => {
    const claims = decodeGoogleIdToken(fakeIdToken({ sub: 'g-1', email: 'a@b.it', email_verified: true }));
    expect(claims).toEqual({ sub: 'g-1', email: 'a@b.it', email_verified: true });
  });

  it('allows a verified email for a new user or a user not yet linked', () => {
    const claims = { sub: 'g-1', email: 'a@b.it', email_verified: true };
    expect(rejectGoogleIdentity(claims, undefined)).toBeNull();
    expect(rejectGoogleIdentity(claims, { googleId: null })).toBeNull();
    expect(rejectGoogleIdentity(claims, { googleId: 'g-1' })).toBeNull();
  });

  it('accepts the string form of email_verified', () => {
    expect(rejectGoogleIdentity({ sub: 'g-1', email: 'a@b.it', email_verified: 'true' }, undefined)).toBeNull();
  });

  it('rejects an unverified or missing email_verified claim', () => {
    expect(rejectGoogleIdentity({ sub: 'g-1', email: 'a@b.it', email_verified: false }, undefined)).not.toBeNull();
    expect(rejectGoogleIdentity({ sub: 'g-1', email: 'a@b.it' }, { googleId: null })).not.toBeNull();
  });

  it('rejects a different Google account claiming an already-linked email', () => {
    const claims = { sub: 'g-attacker', email: 'a@b.it', email_verified: true };
    expect(rejectGoogleIdentity(claims, { googleId: 'g-owner' })).not.toBeNull();
  });
});
