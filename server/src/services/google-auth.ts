export type GoogleAuthEnv = {
  // Option A: OAuth refresh token (for personal Google accounts)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  // Option B: Service account JWT (for Google Workspace / Shared Drives)
  GOOGLE_SERVICE_ACCOUNT_KEY?: string;
};

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
].join(' ');

function base64url(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function encodeJson(obj: object): string {
  const json = JSON.stringify(obj);
  const encoder = new TextEncoder();
  return base64url(encoder.encode(json).buffer as ArrayBuffer);
}

function pemToDer(pem: string): ArrayBuffer {
  const stripped = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(stripped);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function signRS256(payload: string, privateKeyPem: string): Promise<string> {
  const der = pemToDer(privateKeyPem);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(payload));
  return base64url(signature);
}

async function getTokenViaRefreshToken(env: GoogleAuthEnv): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      refresh_token: env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google OAuth refresh failed: ${response.status} ${text}`);
  }

  const data = await response.json<{ access_token: string }>();
  return data.access_token;
}

async function getTokenViaServiceAccount(env: GoogleAuthEnv): Promise<string> {
  const serviceAccount: ServiceAccountKey = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY!);

  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: 'RS256', typ: 'JWT' });
  const claim = encodeJson({
    iss: serviceAccount.client_email,
    scope: SCOPES,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  });

  const signingInput = `${header}.${claim}`;
  const signature = await signRS256(signingInput, serviceAccount.private_key);
  const jwt = `${signingInput}.${signature}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google service account auth failed: ${response.status} ${text}`);
  }

  const data = await response.json<{ access_token: string }>();
  return data.access_token;
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token refresh failed: ${response.status} ${text}`);
  }

  const data = await response.json<{ access_token: string }>();
  return data.access_token;
}

export async function getAccessToken(env: GoogleAuthEnv): Promise<string> {
  if (env.GOOGLE_REFRESH_TOKEN && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    return getTokenViaRefreshToken(env);
  }
  if (env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return getTokenViaServiceAccount(env);
  }
  throw new Error(
    'No Google auth credentials configured. Set either GOOGLE_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET, or GOOGLE_SERVICE_ACCOUNT_KEY.',
  );
}
