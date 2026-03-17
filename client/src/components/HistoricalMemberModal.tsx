import React, { useState } from 'react';
import { X, User, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const text = members.map(m => `• ${m.firstName} ${m.lastName}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayDate = new Date(date).toLocaleDateString(i18n.language, { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('timeline.members')}</h2>
            <p className="text-slate-500 text-sm mt-1">Snapshot: {displayDate} • {assemblyLabel}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Info & Actions */}
        <div className="bg-slate-950/50 p-4 border-b border-slate-800 flex items-center justify-between px-6">
          <div className="text-sm font-bold text-slate-400">
            {t('common.total', { defaultValue: 'Total' })}: <span className="text-blue-400">{members.length} {t('timeline.members').toLowerCase()}</span>
          </div>
          <button 
            onClick={handleCopy}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-black transition-all"
          >
            {copied ? (
              <>
                <Check size={14} className="text-green-400" />
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
                className="flex items-center space-x-3 p-3 bg-slate-950/30 border border-slate-800 rounded-2xl hover:border-blue-900/50 transition-all hover:bg-slate-800/10 group"
              >
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-blue-900/20 group-hover:text-blue-400 transition-colors">
                  <User size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-200 uppercase tracking-tight">{m.firstName} {m.lastName}</span>
                  <span className="text-[10px] text-slate-600 font-mono italic">#{idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-black text-sm uppercase transition-all shadow-lg shadow-blue-900/20"
          >
            {t('common.close', { defaultValue: 'Close' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoricalMemberModal;
