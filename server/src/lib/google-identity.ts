/**
 * Claims we rely on from a Google ID token. The token comes straight from Google's
 * token endpoint over TLS, so its signature does not need re-verifying here, but
 * its claims still decide which local account the caller becomes.
 */
export type GoogleIdTokenClaims = {
  sub: string;
  email: string;
  email_verified?: boolean | string;
};

export function decodeGoogleIdToken(idToken: string): GoogleIdTokenClaims {
  const b64 = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
  return JSON.parse(atob(padded)) as GoogleIdTokenClaims;
}

/**
 * Decide whether a Google identity may sign in as the local account matched by email.
 *
 * Accounts are matched by email, so without these checks anyone who controls a
 * Google account carrying that address (unverified, or reassigned after the
 * original owner left) could take over the local user.
 *
 * @returns an error message to show the user, or null when sign-in may proceed.
 */
export function rejectGoogleIdentity(
  claims: GoogleIdTokenClaims,
  existingUser: { googleId: string | null } | undefined,
): string | null {
  // Google sends a boolean, but some libraries and older tokens use the string form.
  const verified = claims.email_verified === true || claims.email_verified === 'true';
  if (!verified) {
    return 'Google account email is not verified';
  }
  if (existingUser?.googleId && existingUser.googleId !== claims.sub) {
    return 'This email is linked to a different Google account';
  }
  return null;
}
