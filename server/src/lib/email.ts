/**
 * Outgoing email, behind an interface so the provider can be chosen later.
 *
 * EMAIL_PROVIDER selects the sender:
 *   - unset     → no sender: every email-based feature (email verification,
 *                 email sign-in codes) is switched off rather than locking users out.
 *   - "log"     → prints messages to the Worker log. Local development only.
 * A real provider (Resend, Cloudflare Email, …) is added as another case here.
 */

export type EmailMessage = { to: string; subject: string; text: string };

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export type EmailEnv = { EMAIL_PROVIDER?: string; EMAIL_SENDER?: EmailSender };

const logSender: EmailSender = {
  async send({ to, subject, text }) {
    console.log(`[email:log] to=${to} subject=${JSON.stringify(subject)}\n${text}`);
  },
};

/**
 * The configured sender, or null when email is not set up. Tests (and future
 * bindings) can pass a ready sender as EMAIL_SENDER.
 */
export function createEmailSender(env: EmailEnv): EmailSender | null {
  if (env.EMAIL_SENDER) return env.EMAIL_SENDER;
  switch (env.EMAIL_PROVIDER?.trim().toLowerCase()) {
    case 'log':
      return logSender;
    case undefined:
    case '':
      return null;
    default:
      console.error(`Unknown EMAIL_PROVIDER "${env.EMAIL_PROVIDER}"; email features are off`);
      return null;
  }
}
