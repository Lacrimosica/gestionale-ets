import { useTranslation } from 'react-i18next';
import { SquareDot } from 'lucide-react';
import type { ComplianceRules } from '../../hooks/useCompliance';
import { SectionHeader } from './ComplianceEditorShared';

interface BaseRequirementsSectionProps {
  rules: ComplianceRules;
  onToggleBaseReq: (
    context: 'isVolunteer' | 'isSocio' | 'isBoard',
    docKey: string
  ) => void;
}

export const BaseRequirementsSection = ({
  rules,
  onToggleBaseReq,
}: BaseRequirementsSectionProps) => {
  const { t } = useTranslation();
  const docTypeKeys = Object.keys(rules.documentTypes);
  const baseContexts: {
    key: 'isVolunteer' | 'isSocio' | 'isBoard';
    label: string;
  }[] = [
    { key: 'isVolunteer', label: t('settings.compliance.baseRequirementsContexts.volunteer') },
    { key: 'isSocio', label: t('settings.compliance.baseRequirementsContexts.member') },
    { key: 'isBoard', label: t('settings.compliance.baseRequirementsContexts.boardMember') },
  ];

  return (
    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
      <SectionHeader
        icon={<SquareDot className="text-emerald-400" size={18} />}
        title={t('settings.compliance.sections.baseRequirements')}
        subtitle={t('settings.compliance.sections.baseRequirementsSubtitle')}
      />
      <div className="space-y-4">
        {baseContexts.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {label}
            </p>
            <div className="flex flex-wrap gap-2">
              {docTypeKeys.map((d) => {
                const included = rules.baseRequirements[key].includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onToggleBaseReq(key, d)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                      included
                        ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700 shadow-sm'
                        : 'border-dashed border-slate-700 text-slate-500 hover:border-emerald-600 hover:text-emerald-400'
                    }`}
                  >
                    {included ? '✓ ' : '+ '}
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
