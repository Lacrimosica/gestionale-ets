/**
 * Shared authentication utilities for Cloudflare Workers.
 */

/**
 * Hash a password using PBKDF2.
 * Returns a string in the format "salt:hash".
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exportedKey = await crypto.subtle.exportKey('raw', key);
  const hash = btoa(String.fromCharCode(...new Uint8Array(exportedKey as ArrayBuffer)));
  const saltStr = btoa(String.fromCharCode(...salt));

  return `${saltStr}:${hash}`;
}

/**
 * Verify a password against a stored hash string.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored || !stored.includes(':')) return false;
  
  const [saltStr, hash] = stored.split(':');
  let salt: Uint8Array;
  try {
    salt = new Uint8Array(atob(saltStr).split('').map(c => c.charCodeAt(0)));
  } catch {
    return false;
  }
  
  const passwordData = new TextEncoder().encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exportedKey = await crypto.subtle.exportKey('raw', key);
  const derivedHash = btoa(String.fromCharCode(...new Uint8Array(exportedKey as ArrayBuffer)));

  return hash === derivedHash;
}
