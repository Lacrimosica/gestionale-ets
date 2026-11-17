import { Users as UsersIcon, Video, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AssemblyDetailData } from '../../types/assembly';

interface ModeBadgeProps {
  assembly: AssemblyDetailData;
  modalityOptions: Array<{ value: string; label: string }>;
}

export const ModeBadge = ({ assembly, modalityOptions }: ModeBadgeProps) => {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
        assembly.mode === 'in_person'
          ? 'bg-success-900/40 text-success-400 border-success-800'
          : assembly.mode === 'remote'
            ? 'bg-info-900/40 text-info-400 border-info-800'
            : 'bg-special-900/40 text-special-400 border-special-800'
      }`}
    >
      {assembly.mode === 'in_person' && <UsersIcon size={11} />}
      {assembly.mode === 'remote' && <Video size={11} />}
      {assembly.mode === 'hybrid' && <Globe size={11} />}
      {(() => {
        const opt = modalityOptions.find((o) => o.value === assembly.modalityFormulaPrima);
        return opt ? opt.label : t(`assemblies.modes.${assembly.mode}`, { defaultValue: assembly.mode });
      })()}
    </span>
  );
};
