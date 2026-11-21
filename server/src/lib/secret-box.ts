/**
 * AES-GCM encryption for small secrets stored in D1 (TOTP seeds), so a database
 * dump alone doesn't let anyone generate users' codes.
 *
 * The key is MFA_ENCRYPTION_KEY: 32 random bytes, base64-encoded
 * (`openssl rand -base64 32`). Output format: base64(iv) + "." + base64(ciphertext).
 */

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function importKey(keyB64: string): Promise<CryptoKey> {
  const raw = fromB64(keyB64);
  if (raw.length !== 32) throw new Error('MFA_ENCRYPTION_KEY must be 32 bytes, base64-encoded');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function sealSecret(plaintext: string, keyB64: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importKey(keyB64);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  return `${toB64(iv)}.${toB64(new Uint8Array(ct))}`;
}

export async function openSecret(sealed: string, keyB64: string): Promise<string> {
  const [ivB64, ctB64] = sealed.split('.');
  if (!ivB64 || !ctB64) throw new Error('Malformed sealed secret');
  const key = await importKey(keyB64);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(ivB64) }, key, fromB64(ctB64));
  return new TextDecoder().decode(pt);
}
