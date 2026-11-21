import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, KeyRound, Loader2, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { CodeInput } from '../auth/CodeInput';
import { RecoveryCodesPanel } from '../auth/RecoveryCodesPanel';
import { TotpSetupPanel } from '../auth/TotpSetupPanel';
import { errorMessage, twoStepSettings, type FactorMethod, type MfaMethod, type MfaStatus, type TotpSetup } from '../../lib/two-step';

/** A change that needs a current code before the server applies it. */
type PendingChange = { kind: 'disable'; target: MfaMethod } | { kind: 'regenerate' };

type Panel =
  | { kind: 'none' }
  | { kind: 'totp_setup'; setup: TotpSetup }
  | { kind: 'email_confirm' }
  | { kind: 'confirm_change'; change: PendingChange }
  | { kind: 'codes'; codes: string[] };

interface TwoFactorSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

export const TwoFactorSection = ({ expanded, onToggle }: TwoFactorSectionProps) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [panel, setPanel] = useState<Panel>({ kind: 'none' });
  const [code, setCode] = useState('');
  const [factor, setFactor] = useState<FactorMethod>('totp');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await twoStepSettings.status());
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) ?? t('auth.twoStep.genericError') });
    }
  }, [t]);

  useEffect(() => {
    if (expanded && !status) void refresh();
  }, [expanded, status, refresh]);

  const open = (next: Panel) => {
    setPanel(next);
    setCode('');
    setMessage(null);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) ?? t('auth.twoStep.genericError') });
    } finally {
      setBusy(false);
    }
  };

  /** After enabling: show recovery codes if this was the first method, then reload. */
  const afterEnable = async (result: { recoveryCodes?: string[] }) => {
    await refresh();
    if (result.recoveryCodes?.length) open({ kind: 'codes', codes: result.recoveryCodes });
    else {
      open({ kind: 'none' });
      setMessage({ tone: 'ok', text: t('settings.twoStep.enabled') });
    }
  };

  const startChange = (change: PendingChange) => {
    const enabled = status?.methods ?? [];
    const first: MfaMethod = enabled.includes('totp') ? 'totp' : 'email';
    setFactor(first);
    open({ kind: 'confirm_change', change });
    if (first === 'email') void run(async () => { await twoStepSettings.sendLoginCode(); setMessage({ tone: 'ok', text: t('settings.twoStep.emailSent') }); });
  };

  const confirmChange = (change: PendingChange) => run(async () => {
    if (change.kind === 'disable') {
      await twoStepSettings.disable(change.target, factor, code);
      await refresh();
      open({ kind: 'none' });
      setMessage({ tone: 'ok', text: t('settings.twoStep.disabled') });
    } else {
      const codes = await twoStepSettings.regenerateRecoveryCodes(factor as MfaMethod, code);
      await refresh();
      open({ kind: 'codes', codes });
    }
  });

  const methods = status?.methods ?? [];
  const row = (method: MfaMethod, icon: React.ReactNode, label: string, available: boolean, onEnable: () => void) => (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="font-medium text-fg">{label}</div>
          <div className="text-xs text-neutral-500">
            {!available ? t('settings.twoStep.unavailable') : methods.includes(method) ? t('settings.twoStep.on') : t('settings.twoStep.off')}
          </div>
        </div>
      </div>
      {available && (methods.includes(method) ? (
        <button type="button" disabled={busy} onClick={() => startChange({ kind: 'disable', target: method })} className="text-sm text-danger-400 hover:text-danger-300 disabled:opacity-50">
          {t('settings.twoStep.turnOff')}
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={onEnable} className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50">
          {t('settings.twoStep.turnOn')}
        </button>
      ))}
    </div>
  );

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-xl space-y-4">
      <button onClick={onToggle} className="w-full flex items-center justify-between hover:opacity-80 transition-opacity">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-accent-400" />
          <div className="text-left">
            <h2 className="text-lg font-semibold text-fg">{t('settings.twoStep.title')}</h2>
            <p className="text-sm text-neutral-500">{t('settings.twoStep.description')}</p>
          </div>
        </div>
        <ChevronDown size={20} className={`text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-4 max-w-3xl mx-auto">
          {!status ? (
            <Loader2 className="animate-spin text-neutral-500" size={20} />
          ) : (
            <>
              {status.required && <p className="text-sm text-warning-300">{t('settings.twoStep.requiredNote')}</p>}
              <p className="text-xs text-neutral-500">{t('settings.twoStep.passwordOnlyNote')}</p>

              {row('totp', <Smartphone size={18} className="text-accent-500" />, t('auth.twoStep.enrollTotp'), status.available.totp,
                () => run(async () => open({ kind: 'totp_setup', setup: await twoStepSettings.totpSetup() })))}
              {row('email', <Mail size={18} className="text-accent-500" />, t('auth.twoStep.enrollEmail'), status.available.email,
                () => run(async () => { await twoStepSettings.emailEnable(); open({ kind: 'email_confirm' }); }))}

              {methods.length > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
                  <div className="flex items-center gap-3">
                    <KeyRound size={18} className="text-warning-400" />
                    <div>
                      <div className="font-medium text-fg">{t('settings.twoStep.recoveryCodes')}</div>
                      <div className="text-xs text-neutral-500">{t('settings.twoStep.recoveryLeft', { count: status.recoveryCodesLeft })}</div>
                    </div>
                  </div>
                  <button type="button" disabled={busy} onClick={() => startChange({ kind: 'regenerate' })} className="text-sm text-accent-500 hover:text-accent-400 disabled:opacity-50">
                    {t('settings.twoStep.regenerate')}
                  </button>
                </div>
              )}

              {panel.kind === 'totp_setup' && (
                <TotpSetupPanel setup={panel.setup} busy={busy} onConfirm={(c) => run(async () => afterEnable(await twoStepSettings.totpConfirm(c)))} />
              )}

              {panel.kind === 'email_confirm' && (
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(async () => afterEnable(await twoStepSettings.emailConfirm(code))); }}>
                  <p className="text-sm text-neutral-400">{t('settings.twoStep.emailSent')}</p>
                  <CodeInput value={code} onChange={setCode} autoFocus disabled={busy} />
                  <button type="submit" disabled={busy || code.length !== 6} className="rounded-lg bg-accent-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
                    {t('auth.twoStep.confirm')}
                  </button>
                </form>
              )}

              {panel.kind === 'confirm_change' && (
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void confirmChange(panel.change); }}>
                  <p className="text-sm text-neutral-400">{t('settings.twoStep.confirmChange')}</p>
                  <div className="flex flex-wrap gap-2">
                    {([...methods, ...(panel.change.kind === 'disable' ? ['recovery' as const] : [])] as FactorMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setFactor(m);
                          setCode('');
                          if (m === 'email') void run(async () => { await twoStepSettings.sendLoginCode(); setMessage({ tone: 'ok', text: t('settings.twoStep.emailSent') }); });
                        }}
                        className={`rounded-lg border px-3 py-1 text-sm ${factor === m ? 'border-accent-500 text-fg' : 'border-neutral-700 text-neutral-400'}`}
                      >
                        {m === 'totp' ? t('auth.twoStep.useApp') : m === 'email' ? t('auth.twoStep.useEmail') : t('auth.twoStep.useRecovery')}
                      </button>
                    ))}
                  </div>
                  <CodeInput key={factor} value={code} onChange={setCode} kind={factor === 'recovery' ? 'recovery' : 'otp'} autoFocus disabled={busy} id="two-step-confirm" />
                  <div className="flex gap-3">
                    <button type="submit" disabled={busy || code.length < 6} className="rounded-lg bg-accent-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
                      {t('auth.twoStep.confirm')}
                    </button>
                    <button type="button" onClick={() => open({ kind: 'none' })} className="text-sm text-neutral-400 hover:text-fg">
                      {t('common.actions.cancel')}
                    </button>
                  </div>
                </form>
              )}

              {panel.kind === 'codes' && (
                <RecoveryCodesPanel codes={panel.codes} onContinue={() => open({ kind: 'none' })} continueLabel={t('settings.twoStep.done')} />
              )}

              {message && <p className={`text-sm ${message.tone === 'ok' ? 'text-success-400' : 'text-danger-400'}`}>{message.text}</p>}
            </>
          )}
        </div>
      )}
    </section>
  );
};
