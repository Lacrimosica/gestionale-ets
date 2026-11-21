import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Download, Check } from 'lucide-react';

interface RecoveryCodesPanelProps {
  codes: string[];
  onContinue: () => void;
  continueLabel?: string;
}

/** Shows freshly generated recovery codes once; the user must confirm they saved them. */
export const RecoveryCodesPanel = ({ codes, onContinue, continueLabel }: RecoveryCodesPanelProps) => {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = codes.join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the codes stay visible for manual copying.
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([`Niki recovery codes\n\n${text}\n`], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'niki-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-neutral-400">{t('auth.twoStep.recoveryBody')}</p>
      <ul className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-700 bg-neutral-950 p-4 font-mono text-sm text-fg">
        {codes.map((code) => <li key={code}>{code}</li>)}
      </ul>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-700">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? t('auth.twoStep.copied') : t('auth.twoStep.copy')}
        </button>
        <button type="button" onClick={download} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-700">
          <Download size={16} />
          {t('auth.twoStep.download')}
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        {t('auth.twoStep.savedConfirm')}
      </label>
      <button
        type="button"
        disabled={!saved}
        onClick={onContinue}
        className="w-full rounded-xl bg-accent-600 py-3 font-bold text-white transition-all hover:bg-accent-700 disabled:opacity-50"
      >
        {continueLabel ?? t('auth.twoStep.continue')}
      </button>
    </div>
  );
};
