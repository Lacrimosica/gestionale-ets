import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2 } from 'lucide-react';
import { CodeInput } from './CodeInput';
import type { TotpSetup } from '../../lib/two-step';

interface TotpSetupPanelProps {
  setup: TotpSetup;
  busy: boolean;
  onConfirm: (code: string) => void;
}

/** QR code and manual key for an authenticator app, then the first code to confirm it. */
export const TotpSetupPanel = ({ setup, busy, onConfirm }: TotpSetupPanelProps) => {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  // Grouped in fours so the key is easier to type by hand.
  const groupedKey = setup.secret.match(/.{1,4}/g)?.join(' ') ?? setup.secret;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) onConfirm(code);
      }}
    >
      <p className="text-sm leading-6 text-neutral-400">{t('auth.twoStep.scanQr')}</p>
      <div className="flex justify-center rounded-xl bg-white p-4">
        <QRCodeSVG value={setup.uri} size={176} marginSize={0} />
      </div>
      <details className="text-sm text-neutral-400">
        <summary className="cursor-pointer">{t('auth.twoStep.manualKey')}</summary>
        <code className="mt-2 block select-all break-all rounded-lg bg-neutral-950 p-3 font-mono text-fg">{groupedKey}</code>
      </details>
      <CodeInput value={code} onChange={setCode} autoFocus disabled={busy} id="totp-setup-code" />
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-600 py-3 font-bold text-white hover:bg-accent-700 disabled:opacity-50"
      >
        {busy && <Loader2 className="animate-spin" size={18} />}
        {t('auth.twoStep.confirm')}
      </button>
    </form>
  );
};
