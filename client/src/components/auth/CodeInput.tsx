import { useTranslation } from 'react-i18next';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Recovery codes are letters and digits (xxxx-xxxx); one-time codes are 6 digits. */
  kind?: 'otp' | 'recovery';
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
}

export const CodeInput = ({ value, onChange, kind = 'otp', autoFocus, disabled, id = 'two-step-code' }: CodeInputProps) => {
  const { t } = useTranslation();
  const isOtp = kind === 'otp';
  return (
    <div>
      <label htmlFor={id} className="mb-2 ml-1 block text-sm font-medium text-neutral-300">
        {isOtp ? t('auth.twoStep.codeLabel') : t('auth.twoStep.recoveryLabel')}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(isOtp ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value.slice(0, 12))}
        inputMode={isOtp ? 'numeric' : 'text'}
        autoComplete={isOtp ? 'one-time-code' : 'off'}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={isOtp ? '123456' : 'abcd-efgh'}
        className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-center font-mono text-xl tracking-[0.4em] text-fg outline-none transition-all placeholder:text-neutral-600 focus:border-accent-500 focus:ring-4 focus:ring-accent-600/10"
      />
    </div>
  );
};
