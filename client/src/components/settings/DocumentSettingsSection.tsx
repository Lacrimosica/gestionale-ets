import { ChevronDown, FileText, Save, Eye } from 'lucide-react';
import { type DocumentSettings } from '../../hooks/useSettings';
import OrgInfoFields from './OrgInfoFields';
import StatuteArticlesFields from './StatuteArticlesFields';
import DefaultContentSection from './DefaultContentSection';
import GoogleDriveTemplatesSection from './GoogleDriveTemplatesSection';
import DocumentPreviewModal from './DocumentPreviewModal';
import ModalityOptionsManager from './ModalityOptionsManager';

const GOOGLE_ID_FIELDS: (keyof DocumentSettings)[] = [
  'outputFolderId',
  'templateConvocationId',
  'templateMinutes1aId',
  'templateMinutes2aId',
  'templateConvocationExtraordinaryStatuteId',
  'templateConvocationExtraordinaryDissolutionId',
  'templateConvocationBoardId',
  'templateMinutesBoardId',
];

function extractGoogleId(value: string): string {
  const slashMatch = value.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (slashMatch) return slashMatch[1];
  const queryMatch = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];
  return value.trim();
}

interface ModalityOption {
  id: string;
  type: 'convocation' | 'minutes_opening';
  label: string;
  value: string;
  mode?: 'in_person' | 'remote' | 'hybrid' | 'any';
  isDefault?: boolean;
}

type PreviewTemplate = 'convocation' | 'convocation_extraordinary_statute' | 'convocation_extraordinary_dissolution' | 'convocation_board' | 'minutes1a' | 'minutes2a' | 'minutes_board';
type ModalityDraft = { type: 'convocation' | 'minutes_opening'; mode: 'in_person' | 'remote' | 'hybrid' | 'any'; label: string; value: string };
type EditingModalityDraft = { label: string; value: string; mode: 'in_person' | 'remote' | 'hybrid' | 'any' };

interface DocumentSettingsSectionProps {
  expandedSections: Record<string, boolean>;
  docForm: Partial<DocumentSettings>;
  modalityOptions: ModalityOption[];
  docMessage: string | null;
  savingDoc: boolean;
  previewOpen: boolean;
  previewTemplate: PreviewTemplate;
  brandingOrganizationName: string;
  onToggleSection: (section: string) => void;
  onFormChange: (field: keyof DocumentSettings, value: any) => void;
  onSave: (form: Partial<DocumentSettings>) => Promise<void>;
  onPreviewTemplateChange: (template: PreviewTemplate) => void;
  onPreviewOpen: (open: boolean) => void;
  modalityDraft: ModalityDraft;
  editingModalityId: string | null;
  editingModalityDraft: EditingModalityDraft;
  onModalityDraftChange: (draft: ModalityDraft) => void;
  onEditingModalityChange: (draft: EditingModalityDraft) => void;
  onEditingModalityIdChange: (id: string | null) => void;
  onCreateModality: (data: { type: 'convocation' | 'minutes_opening'; mode: 'in_person' | 'remote' | 'hybrid' | 'any'; label: string; value: string }) => Promise<void>;
  onUpdateModality: (id: string, draft: EditingModalityDraft) => Promise<void>;
  onRemoveModality: (id: string) => Promise<void>;
}

const DocumentSettingsSection = ({
  expandedSections,
  docForm,
  modalityOptions,
  docMessage,
  savingDoc,
  previewOpen,
  previewTemplate,
  brandingOrganizationName,
  onToggleSection,
  onFormChange,
  onSave,
  onPreviewTemplateChange,
  onPreviewOpen,
  modalityDraft,
  editingModalityId,
  editingModalityDraft,
  onModalityDraftChange,
  onEditingModalityChange,
  onEditingModalityIdChange,
  onCreateModality,
  onUpdateModality,
  onRemoveModality,
}: DocumentSettingsSectionProps) => {

  const handleSave = async () => {
    const cleaned: Partial<DocumentSettings> = { ...docForm };
    for (const field of GOOGLE_ID_FIELDS) {
      const v = cleaned[field];
      if (typeof v === 'string' && v) {
        (cleaned as Record<string, unknown>)[field] = extractGoogleId(v);
      }
    }
    onFormChange('city' as any, cleaned.city);
    await onSave(cleaned);
  };

  return (
    <>
      <DocumentPreviewModal
        isOpen={previewOpen}
        template={previewTemplate}
        docForm={docForm}
        organizationName={brandingOrganizationName}
        onClose={() => onPreviewOpen(false)}
        onTemplateChange={onPreviewTemplateChange}
      />

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <button
          onClick={() => onToggleSection('documents')}
          className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <FileText className="text-sky-400" size={20} />
            <div className="text-left">
              <h2 className="text-lg font-semibold text-white">Impostazioni Documenti</h2>
              <p className="text-sm text-slate-500">Org info, statute articles, Google Drive templates and modality options</p>
            </div>
          </div>
          <ChevronDown size={20} className={`text-slate-400 transition-transform ${expandedSections.documents ? 'rotate-180' : ''}`} />
        </button>

        {expandedSections.documents && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <OrgInfoFields
              city={docForm.city ?? null}
              maxProxies={docForm.maxProxies ?? null}
              onFormChange={onFormChange}
            />

            <StatuteArticlesFields
              articles={{
                statuteArticleConvocation: (docForm.statuteArticleConvocation as string) ?? null,
                statuteArticleProxies: (docForm.statuteArticleProxies as string) ?? null,
                statuteArticleMembers: (docForm.statuteArticleMembers as string) ?? null,
                statuteArticleBoardVote: (docForm.statuteArticleBoardVote as string) ?? null,
                statuteArticleBoardElection: (docForm.statuteArticleBoardElection as string) ?? null,
              }}
              onFormChange={onFormChange}
            />

            <DefaultContentSection
              // Phase 5: Use new field name with fallback to old
              miscellaneousDefaultText={docForm.miscellaneousDefaultText ?? docForm.varieDefaultText ?? null}
              onFormChange={onFormChange}
            />

            <GoogleDriveTemplatesSection
              templates={{
                outputFolderId: (docForm.outputFolderId as string) ?? null,
                templateConvocationId: (docForm.templateConvocationId as string) ?? null,
                templateConvocationExtraordinaryStatuteId: (docForm.templateConvocationExtraordinaryStatuteId as string) ?? null,
                templateConvocationExtraordinaryDissolutionId: (docForm.templateConvocationExtraordinaryDissolutionId as string) ?? null,
                templateMinutes1aId: (docForm.templateMinutes1aId as string) ?? null,
                templateMinutes2aId: (docForm.templateMinutes2aId as string) ?? null,
                templateConvocationBoardId: (docForm.templateConvocationBoardId as string) ?? null,
                templateMinutesBoardId: (docForm.templateMinutesBoardId as string) ?? null,
              }}
              onFormChange={onFormChange}
            />

            {/* Save button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={savingDoc}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold text-sm"
              >
                <Save size={14} />
                {savingDoc ? 'Saving...' : 'Save document settings'}
              </button>
              {docMessage && <p className="text-sm text-slate-400">{docMessage}</p>}
            </div>

            {/* Document preview */}
            <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Document Preview</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={previewTemplate}
                    onChange={(e) => onPreviewTemplateChange(e.target.value as typeof previewTemplate)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                  >
                    <optgroup label="Assemblee dei Soci">
                      <option value="convocation">Convocazione Ordinaria</option>
                      <option value="convocation_extraordinary_statute">Convocazione Straordinaria — Modifica Statuto</option>
                      <option value="convocation_extraordinary_dissolution">Convocazione Straordinaria — Scioglimento</option>
                      <option value="minutes1a">Verbale 1a (deserta)</option>
                      <option value="minutes2a">Verbale 2a</option>
                    </optgroup>
                    <optgroup label="Consiglio Direttivo">
                      <option value="convocation_board">Convocazione Riunione CD</option>
                      <option value="minutes_board">Verbale Riunione CD</option>
                    </optgroup>
                  </select>
                  <button
                    onClick={() => onPreviewOpen(true)}
                    className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg text-xs font-semibold"
                  >
                    <Eye size={13} />
                    Preview
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Settings values are substituted. Per-assembly fields shown as <span className="text-sky-400 font-mono">⟨PLACEHOLDER⟩</span>.
              </p>
            </div>

            <ModalityOptionsManager
              options={modalityOptions}
              modalityDraft={modalityDraft}
              editingModalityId={editingModalityId}
              editingModalityDraft={editingModalityDraft}
              onModalityDraftChange={onModalityDraftChange}
              onEditingModalityChange={onEditingModalityChange}
              onEditingModalityIdChange={onEditingModalityIdChange}
              onCreateModality={onCreateModality}
              onUpdateModality={onUpdateModality}
              onRemoveModality={onRemoveModality}
            />
          </div>
        )}
      </section>
    </>
  );
};

export default DocumentSettingsSection;
