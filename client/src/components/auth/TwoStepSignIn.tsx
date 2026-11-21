import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { AlertCircle, ArrowLeft, KeyRound, Loader2, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { CodeInput } from './CodeInput';
import { RecoveryCodesPanel } from './RecoveryCodesPanel';
import { TotpSetupPanel } from './TotpSetupPanel';
import {
  errorMessage,
  isPendingStep,
  signInSteps,
  type FactorMethod,
  type LoginResponse,
  type MfaMethod,
  type PendingStep,
  type Session,
  type TotpSetup,
} from '../../lib/two-step';

type View =
  | { kind: 'verify_email' }
  | { kind: 'mfa'; methods: MfaMethod[] }
  | { kind: 'enroll'; available: { totp: boolean; email: boolean } }
  | { kind: 'enroll_totp'; setup: TotpSetup }
  | { kind: 'enroll_email' }
  | { kind: 'recovery_codes'; codes: string[]; session: Session };

const viewFor = (step: PendingStep): View =>
  step.step === 'verify_email' ? { kind: 'verify_email' }
    : step.step === 'mfa' ? { kind: 'mfa', methods: step.methods }
      : { kind: 'enroll', available: step.available };

interface TwoStepSignInProps {
  initial: PendingStep;
  email: string;
  onSignedIn: (session: Session) => void;
  onCancel: () => void;
}

/**
 * Everything after the password: email confirmation, the second factor, or enrolment.
 * The server decides each next step; this component only renders it.
 */
export const TwoStepSignIn = ({ initial, email, onSignedIn, onCancel }: TwoStepSignInProps) => {
  const { t } = useTranslation();
  const [pendingToken, setPendingToken] = useState(initial.pendingToken);
  const [view, setView] = useState<View>(viewFor(initial));
  const [method, setMethod] = useState<FactorMethod>(initial.step === 'mfa' ? initial.methods[0] : 'totp');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const go = (next: View) => {
    setView(next);
    setCode('');
    setError(null);
    setInfo(null);
  };

  const handle = (response: LoginResponse) => {
    if (!isPendingStep(response)) return onSignedIn(response);
    setPendingToken(response.pendingToken);
    if (response.step === 'mfa') setMethod(response.methods[0]);
    go(viewFor(response));
  };

  /** Run a server call with shared busy/error handling. */
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      const expired = axios.isAxiosError(err) && err.response?.status === 401;
      setError(expired ? t('auth.twoStep.expired') : errorMessage(err) ?? t('auth.twoStep.genericError'));
    } finally {
      setBusy(false);
    }
  };

  const sendEmail = () => run(async () => {
    await signInSteps.sendEmailCode(pendingToken);
    setInfo(t('auth.twoStep.codeSent', { email }));
  });

  const finishEnrolment = (result: Session & { recoveryCodes: string[] }) =>
    go({ kind: 'recovery_codes', codes: result.recoveryCodes, session: { token: result.token, user: result.user } });

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (view.kind === 'verify_email') return run(async () => handle(await signInSteps.verifyEmail(pendingToken, code)));
    if (view.kind === 'mfa') return run(async () => onSignedIn(await signInSteps.verify(pendingToken, method, code)));
    if (view.kind === 'enroll_email') return run(async () => finishEnrolment(await signInSteps.emailConfirm(pendingToken, code)));
  };

  const titles: Record<View['kind'], string> = {
    verify_email: t('auth.twoStep.titleVerifyEmail'),
    mfa: t('auth.twoStep.titleMfa'),
    enroll: t('auth.twoStep.titleEnroll'),
    enroll_totp: t('auth.twoStep.titleEnrollTotp'),
    enroll_email: t('auth.twoStep.titleEnrollEmail'),
    recovery_codes: t('auth.twoStep.titleRecovery'),
  };

  const codeForm = (body: string, extra?: React.ReactNode) => (
    <form onSubmit={submitCode} className="space-y-4">
      <p className="text-sm leading-6 text-neutral-400">{body}</p>
      <CodeInput
        key={method}
        value={code}
        onChange={setCode}
        kind={view.kind === 'mfa' && method === 'recovery' ? 'recovery' : 'otp'}
        autoFocus
        disabled={busy}
      />
      <button
        type="submit"
        disabled={busy || code.length < 6}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-600 py-3 font-bold text-white hover:bg-accent-700 disabled:opacity-50"
      >
        {busy ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
        {t('auth.twoStep.verify')}
      </button>
      {extra}
    </form>
  );

  const linkButton = (label: string, onClick: () => void, icon?: React.ReactNode) => (
    <button type="button" onClick={onClick} disabled={busy} className="flex items-center gap-2 text-sm font-medium text-accent-500 hover:text-accent-400 disabled:opacity-50">
      {icon}
      {label}
    </button>
  );

  const mfaBody = method === 'totp' ? t('auth.twoStep.mfaTotpBody')
    : method === 'email' ? t('auth.twoStep.mfaEmailBody', { email })
      : t('auth.twoStep.mfaRecoveryBody');

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-neutral-100">{titles[view.kind]}</h2>

      {view.kind === 'verify_email' && codeForm(
        t('auth.twoStep.verifyEmailBody', { email }),
        linkButton(t('auth.twoStep.resend'), sendEmail, <Mail size={16} />),
      )}

      {view.kind === 'mfa' && codeForm(mfaBody, (
        <div className="flex flex-col gap-2">
          {method === 'email' && linkButton(t('auth.twoStep.resend'), sendEmail, <Mail size={16} />)}
          {view.methods.filter((m) => m !== method).map((m) => linkButton(
            m === 'totp' ? t('auth.twoStep.useApp') : t('auth.twoStep.useEmail'),
            () => {
              setMethod(m);
              setCode('');
              if (m === 'email') void sendEmail();
            },
            m === 'totp' ? <Smartphone size={16} /> : <Mail size={16} />,
          ))}
          {method !== 'recovery' && linkButton(t('auth.twoStep.useRecovery'), () => { setMethod('recovery'); setCode(''); }, <KeyRound size={16} />)}
        </div>
      ))}

      {view.kind === 'enroll' && (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-neutral-400">{t('auth.twoStep.enrollBody')}</p>
          {view.available.totp && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(async () => go({ kind: 'enroll_totp', setup: await signInSteps.totpSetup(pendingToken) }))}
              className="flex w-full items-start gap-3 rounded-xl border border-neutral-700 bg-neutral-950/40 p-4 text-left hover:border-accent-500"
            >
              <Smartphone className="mt-0.5 shrink-0 text-accent-500" size={20} />
              <span>
                <span className="block font-semibold text-neutral-100">{t('auth.twoStep.enrollTotp')}</span>
                <span className="block text-sm text-neutral-400">{t('auth.twoStep.enrollTotpDesc')}</span>
              </span>
            </button>
          )}
          {view.available.email && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(async () => {
                await signInSteps.sendEmailCode(pendingToken);
                go({ kind: 'enroll_email' });
                setInfo(t('auth.twoStep.codeSent', { email }));
              })}
              className="flex w-full items-start gap-3 rounded-xl border border-neutral-700 bg-neutral-950/40 p-4 text-left hover:border-accent-500"
            >
              <Mail className="mt-0.5 shrink-0 text-accent-500" size={20} />
              <span>
                <span className="block font-semibold text-neutral-100">{t('auth.twoStep.enrollEmail')}</span>
                <span className="block text-sm text-neutral-400">{t('auth.twoStep.enrollEmailDesc', { email })}</span>
              </span>
            </button>
          )}
        </div>
      )}

      {view.kind === 'enroll_totp' && (
        <TotpSetupPanel
          setup={view.setup}
          busy={busy}
          onConfirm={(totp) => run(async () => finishEnrolment(await signInSteps.totpConfirm(pendingToken, totp)))}
        />
      )}

      {view.kind === 'enroll_email' && codeForm(
        t('auth.twoStep.mfaEmailBody', { email }),
        linkButton(t('auth.twoStep.resend'), sendEmail, <Mail size={16} />),
      )}

      {view.kind === 'recovery_codes' && (
        <RecoveryCodesPanel codes={view.codes} onContinue={() => onSignedIn(view.session)} />
      )}

      {info && !error && <p className="text-sm text-success-400">{info}</p>}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-danger-500/30 bg-danger-600/10 p-4 text-sm text-danger-400">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {view.kind !== 'recovery_codes' && (
        <button type="button" onClick={onCancel} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-fg">
          <ArrowLeft size={16} />
          {t('auth.twoStep.startOver')}
        </button>
      )}
    </div>
  );
};
