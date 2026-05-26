import { X } from 'lucide-react';
import { type DocumentSettings } from '../../hooks/useSettings';
import { buildPreviewText } from './documentTemplates';

type PreviewTemplate = 'convocation' | 'convocation_extraordinary_statute' | 'convocation_extraordinary_dissolution' | 'convocation_board' | 'minutes1a' | 'minutes2a' | 'minutes_board';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  template: PreviewTemplate;
  docForm: Partial<DocumentSettings>;
  organizationName: string;
  onClose: () => void;
  onTemplateChange?: (template: PreviewTemplate) => void;
}

const DocumentPreviewModal = ({ isOpen, template, docForm, organizationName, onClose }: DocumentPreviewModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <span className="text-sm font-semibold text-white">
            Preview — {{
              convocation: 'Convocazione Ordinaria',
              convocation_extraordinary_statute: 'Convocazione Straordinaria — Modifica Statuto',
              convocation_extraordinary_dissolution: 'Convocazione Straordinaria — Scioglimento',
              convocation_board: 'Convocazione Riunione CD',
              minutes1a: 'Verbale 1a (deserta)',
              minutes2a: 'Verbale 2a',
              minutes_board: 'Verbale Riunione CD',
            }[template] ?? template}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <pre className="overflow-y-auto p-6 text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
          {buildPreviewText(docForm, template, organizationName)}
        </pre>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
