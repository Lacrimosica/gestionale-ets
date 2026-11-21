import axios from 'axios';
import { API_BASE_URL } from '../config';
import type { AuthUser } from '../hooks/auth-context';

/** Second-factor methods, as the server names them. */
export type MfaMethod = 'totp' | 'email';
export type FactorMethod = MfaMethod | 'recovery';

export type Session = { token: string; user: AuthUser };

/** What POST /auth/login (and each later step) asks for next. */
export type PendingStep =
  | { step: 'verify_email'; pendingToken: string }
  | { step: 'mfa'; pendingToken: string; methods: MfaMethod[] }
  | { step: 'enroll'; pendingToken: string; available: { totp: boolean; email: boolean } };

/** A completed sign-in, or the next step. Old servers return a bare session. */
export type LoginResponse = Session | PendingStep;

export const isPendingStep = (r: LoginResponse): r is PendingStep => 'step' in r;

export type TotpSetup = { secret: string; uri: string };

export const errorMessage = (err: unknown): string | undefined =>
  axios.isAxiosError(err) ? (err.response?.data as { error?: string } | undefined)?.error : undefined;

// ─── Steps of a password sign-in (authenticated by the pending token) ────────

const base = `${API_BASE_URL}/auth/mfa`;

export const signInSteps = {
  verifyEmail: async (pendingToken: string, code: string) =>
    (await axios.post<LoginResponse>(`${base}/verify-email`, { pendingToken, code })).data,
  sendEmailCode: async (pendingToken: string) => {
    await axios.post(`${base}/email/send`, { pendingToken });
  },
  verify: async (pendingToken: string, method: FactorMethod, code: string) =>
    (await axios.post<Session>(`${base}/verify`, { pendingToken, method, code })).data,
  totpSetup: async (pendingToken: string) =>
    (await axios.post<TotpSetup>(`${base}/enroll/totp/setup`, { pendingToken })).data,
  totpConfirm: async (pendingToken: string, code: string) =>
    (await axios.post<Session & { recoveryCodes: string[] }>(`${base}/enroll/totp/confirm`, { pendingToken, code })).data,
  emailConfirm: async (pendingToken: string, code: string) =>
    (await axios.post<Session & { recoveryCodes: string[] }>(`${base}/enroll/email/confirm`, { pendingToken, code })).data,
};

// ─── Self-service for a signed-in user ───────────────────────────────────────

export type MfaStatus = {
  methods: MfaMethod[];
  totpPending: boolean;
  recoveryCodesLeft: number;
  required: boolean;
  available: { totp: boolean; email: boolean };
};

const self = `${API_BASE_URL}/mfa`;

export const twoStepSettings = {
  status: async () => (await axios.get<MfaStatus>(self)).data,
  totpSetup: async () => (await axios.post<TotpSetup>(`${self}/totp/setup`)).data,
  totpConfirm: async (code: string) =>
    (await axios.post<{ recoveryCodes?: string[] }>(`${self}/totp/confirm`, { code })).data,
  emailEnable: async () => {
    await axios.post(`${self}/email/enable`);
  },
  emailConfirm: async (code: string) =>
    (await axios.post<{ recoveryCodes?: string[] }>(`${self}/email/confirm`, { code })).data,
  sendLoginCode: async () => {
    await axios.post(`${self}/email/send-login-code`);
  },
  disable: async (target: MfaMethod, method: FactorMethod, code: string) => {
    await axios.post(`${self}/disable`, { target, method, code });
  },
  regenerateRecoveryCodes: async (method: MfaMethod, code: string) =>
    (await axios.post<{ recoveryCodes: string[] }>(`${self}/recovery-codes`, { method, code })).data.recoveryCodes,
};

export const resetUserTwoStep = async (userId: string) => {
  await axios.delete(`${API_BASE_URL}/settings/users/${userId}/mfa`);
};
