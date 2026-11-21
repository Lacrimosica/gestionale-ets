import { describe, it, expect } from 'vitest';
import { base32Decode, base32Encode, hotp, totpUri, verifyTotp, currentStep } from '../../src/lib/totp';
import { openSecret, sealSecret } from '../../src/lib/secret-box';

const RFC_SECRET = new TextEncoder().encode('12345678901234567890');

describe('HOTP / TOTP', () => {
  it('matches the RFC 4226 HOTP test values', async () => {
    const expected = ['755224', '287082', '359152', '969429', '338314'];
    for (const [counter, code] of expected.entries()) {
      expect(await hotp(RFC_SECRET, counter)).toBe(code);
    }
  });

  it('matches the RFC 6238 SHA-1 TOTP test values', async () => {
    const vectors: Array<[number, string]> = [
      [59, '94287082'],
      [1111111109, '07081804'],
      [1234567890, '89005924'],
      [2000000000, '69279037'],
      [20000000000, '65353130'],
    ];
    for (const [seconds, code] of vectors) {
      expect(await hotp(RFC_SECRET, Math.floor(seconds / 30), 8)).toBe(code);
    }
  });

  it('round-trips base32', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });

  it('accepts the current code once and rejects replays and neighbours already used', async () => {
    const secret = base32Encode(RFC_SECRET);
    const now = Date.now();
    const code = await hotp(RFC_SECRET, currentStep(now));

    const step = await verifyTotp(secret, code, null, now);
    expect(step).toBe(currentStep(now));
    expect(await verifyTotp(secret, code, step, now)).toBeNull();
  });

  it('allows one step of clock skew but not two', async () => {
    const secret = base32Encode(RFC_SECRET);
    const now = Date.now();
    expect(await verifyTotp(secret, await hotp(RFC_SECRET, currentStep(now) - 1), null, now)).not.toBeNull();
    expect(await verifyTotp(secret, await hotp(RFC_SECRET, currentStep(now) - 2), null, now)).toBeNull();
  });

  it('rejects malformed codes', async () => {
    expect(await verifyTotp(base32Encode(RFC_SECRET), 'abcdef', null)).toBeNull();
    expect(await verifyTotp(base32Encode(RFC_SECRET), '12345', null)).toBeNull();
  });

  it('builds an otpauth URI authenticator apps understand', () => {
    const uri = totpUri('Niki', 'a@b.org', 'ABC');
    expect(uri.startsWith('otpauth://totp/Niki%3Aa%40b.org?')).toBe(true);
    expect(uri).toContain('secret=ABC');
    expect(uri).toContain('issuer=Niki');
  });
});

describe('secret box', () => {
  const key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));

  it('round-trips and uses a fresh IV each time', async () => {
    const a = await sealSecret('JBSWY3DPEHPK3PXP', key);
    const b = await sealSecret('JBSWY3DPEHPK3PXP', key);
    expect(a).not.toBe(b);
    expect(await openSecret(a, key)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('fails with the wrong key', async () => {
    const other = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    await expect(openSecret(await sealSecret('x', key), other)).rejects.toThrow();
  });

  it('rejects keys that are not 32 bytes', async () => {
    await expect(sealSecret('x', btoa('short'))).rejects.toThrow(/32 bytes/);
  });
});
