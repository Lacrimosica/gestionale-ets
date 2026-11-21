import React, { useState } from 'react';
import { X, User, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatLongDate } from '../lib/date-utils';


interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface HistoricalMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  members: Member[];
  assemblyLabel: string;
}

const HistoricalMemberModal: React.FC<HistoricalMemberModalProps> = ({ 
  isOpen, 
  onClose, 
  date, 
  members, 
  assemblyLabel 
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const text = members.map(m => `• ${m.firstName} ${m.lastName}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayDate = formatLongDate(date);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-fg uppercase tracking-tight">{t('timeline.members')}</h2>
            <p className="text-neutral-500 text-sm mt-1">Snapshot: {displayDate} • {assemblyLabel}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-xl text-neutral-500 hover:text-fg transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Info & Actions */}
        <div className="bg-neutral-950/50 p-4 border-b border-neutral-800 flex items-center justify-between px-6">
          <div className="text-sm font-bold text-neutral-400">
            {t('common.total', { defaultValue: 'Total' })}: <span className="text-accent-400">{members.length} {t('timeline.members').toLowerCase()}</span>
          </div>
          <button 
            onClick={handleCopy}
            className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-xl text-xs font-black transition-all"
          >
            {copied ? (
              <>
                <Check size={14} className="text-success-400" />
                <span>{t('common.copied', { defaultValue: 'COPIED!' })}</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>{t('timeline.copyMembers').toUpperCase()}</span>
              </>
            )}
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map((m, idx) => (
              <div 
                key={m.id} 
                className="flex items-center space-x-3 p-3 bg-neutral-950/30 border border-neutral-800 rounded-2xl hover:border-accent-900/50 transition-all hover:bg-neutral-800/10 group"
              >
                <div className="w-8 h-8 bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-500 group-hover:bg-accent-900/20 group-hover:text-accent-400 transition-colors">
                  <User size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-neutral-200 uppercase tracking-tight">{m.firstName} {m.lastName}</span>
                  <span className="text-[10px] text-neutral-600 font-mono italic">#{idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-accent-600 hover:bg-accent-500 text-white px-8 py-2.5 rounded-xl font-black text-sm uppercase transition-all shadow-lg shadow-accent-900/20"
          >
            {t('common.close', { defaultValue: 'Close' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoricalMemberModal;
