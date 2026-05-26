import React from 'react';
import { Ghost } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PersonNameTagProps {
  name: string;
  isPresumedNonExistent?: boolean | number;
  className?: string;
}

const PersonNameTag: React.FC<PersonNameTagProps> = ({ name, isPresumedNonExistent, className = '' }) => {
  const { t } = useTranslation();
  const isGhost = isPresumedNonExistent === 1 || isPresumedNonExistent === true;

  if (!isGhost) {
    return <span className={className}>{name}</span>;
  }

  return (
    <span 
      className={`inline-flex items-center gap-1.5 opacity-60 decoration-dashed underline-offset-2 hover:opacity-100 transition-opacity cursor-help ${className}`}
      title={t('common.ghostTitle', { defaultValue: 'Assumed non-existent (legacy/unverified record)' })}
    >
      <Ghost size={12} className="text-slate-400" />
      <span className="italic">{name}</span>
    </span>
  );
};

export default PersonNameTag;
