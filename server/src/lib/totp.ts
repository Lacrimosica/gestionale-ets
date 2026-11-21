/**
 * Time-based one-time passwords (RFC 6238) on WebCrypto, compatible with standard
 * authenticator apps: HMAC-SHA1, 6 digits, 30-second steps.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;
// Accept the previous and next step too, so modest clock skew doesn't lock users out.
const WINDOW = 1;

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** A new random 160-bit secret, base32-encoded (the length RFC 4226 recommends). */
export function generateTotpSecret(): string {
  return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
}

/** HOTP (RFC 4226) for one counter value. */
export async function hotp(secret: Uint8Array, counter: number, digits = DIGITS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

export function currentStep(nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000 / STEP_SECONDS);
}

/**
 * Check `code` against `secret` (base32) around the current time.
 *
 * @param lastStep the last step already accepted for this user; codes at or before
 *                 it are rejected so an observed code can't be replayed.
 * @returns the matched step (store it as the new lastStep), or null.
 */
export async function verifyTotp(
  secret: string,
  code: string,
  lastStep: number | null,
  nowMs = Date.now(),
): Promise<number | null> {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return null;
  const key = base32Decode(secret);
  const now = currentStep(nowMs);
  for (let step = now - WINDOW; step <= now + WINDOW; step++) {
    if (lastStep !== null && step <= lastStep) continue;
    if ((await hotp(key, step)) === normalized) return step;
  }
  return null;
}

/** otpauth:// URI that authenticator apps import from a QR code. */
export function totpUri(issuer: string, account: string, secret: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params}`;
}
