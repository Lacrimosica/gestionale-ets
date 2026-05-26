import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  ArrowLeft, FileText, AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, Trash2,
  Video,
  Calendar,
  MapPin,
  User,
} from 'lucide-react';
import { formatLongDate } from '../lib/date-utils';
import { useModalityOptions } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { PERMISSIONS } from '../lib/permissions';
import { useAddresses } from '../hooks/useSettings';
import { useAssemblyDetail } from '../hooks/useAssemblyDetail';
import { useCandidates } from '../hooks/useCandidates';
import { useDocumentGenerationConfig } from '../hooks/useDocumentGenerationConfig';
import { useAssemblyNavigation } from '../hooks/useAssemblyNavigation';
import { useAssemblyPairingManager } from '../hooks/useAssemblyPairingManager';

import { API_BASE_URL } from '../config';
import { ModeBadge } from '../components/assemblies/ModeBadge';
import { DocumentGenerationPanel } from '../components/assemblies/DocumentGenerationPanel';
import { AgendaItemsList } from '../components/assemblies/AgendaItemsList';
import { DeleteAssemblyModal } from '../components/assemblies/DeleteAssemblyModal';
import { ConvocationMetaPanel } from '../components/assemblies/ConvocationMetaPanel';
import { MemberLinksPanel } from '../components/assemblies/MemberLinksPanel';
import { AttendancePanel } from '../components/assemblies/AttendancePanel';
import { PrimaryAssemblyEditor } from '../components/assemblies/PrimaryAssemblyEditor';
import { SecondaryAssemblyEditor } from '../components/assemblies/SecondaryAssemblyEditor';
import { AssemblyPairingManager } from '../components/assemblies/AssemblyPairingManager';
import type {
  AssemblyDetailData,
} from '../types/assembly';



const AssemblyDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Use hooks for data management
  const {
    id,
    data,
    convocationDetail,
    loading,
    error,
    coreForm,
    setCoreForm,
    partnerForm,
    setPartnerForm,
    setConvocationDetail,
    sortedAssemblies,
    getAssemblyLabel,
  } = useAssemblyDetail();

  // UI state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditingPrimary, setIsEditingPrimary] = useState(false);
  const [updatingPrimary, setUpdatingPrimary] = useState(false);

  // Use extracted hooks
  const { config: genConfig, setConfig, syncSecondCallDate, setTestoVarie } = useDocumentGenerationConfig();
  const { prevAssembly, nextAssembly } = useAssemblyNavigation(id, sortedAssemblies);
  const {
    isDropdownOpen: pairingDropdownOpen,
    dropdownRef: pairingDropdownRef,
    savingPairing,
    isEditingPartner,
    savingPartner,
    setIsDropdownOpen: setPairingDropdownOpen,
    setSavingPairing,
    setIsEditingPartner,
    setSavingPartner,
  } = useAssemblyPairingManager();



  const { options: modalityOptions } = useModalityOptions(true);
  const { addresses } = useAddresses(true);

  // Candidates for member picking
  const { candidates, candidatesLoading } = useCandidates({
    isOpen: genConfig.isOpen,
    hasWorkflowItem: true,
    isEditingPrimary,
    isEditingPartner,
  });

  // Sync genConfig secondCallDate/Time with data
  useEffect(() => {
    if (data) {
      syncSecondCallDate(data.secondCallDate || '', data.secondCallTime || '');
    }
  }, [data]);



  const handleSavePrimary = async () => {
    if (!data) return;
    try {
      setUpdatingPrimary(true);
      await axios.patch(`${API_BASE_URL}/assemblies/${data.id}`, coreForm);
      setIsEditingPrimary(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingPrimary(false);
    }
  };



  // Document generation and agenda management is now handled by child components

  const handleSavePartnerAssembly = async () => {
    if (!partnerForm.id) return;
    try {
      setSavingPartner(true);
      await axios.patch(`${API_BASE_URL}/assemblies/${partnerForm.id}`, partnerForm);

      // Update convocationDetail so the read view reflects the saved data without re-fetching
      // (re-fetching would reset coreForm and lose any unsaved edits on the current assembly)
      setConvocationDetail((prev) => {
        if (!prev) return prev;
        const isCurrentPagePrimary = prev.assemblyId === id;
        const prevPartner = (isCurrentPagePrimary ? prev.assembly2 : prev.assembly1)!;

        const updatedPresident = candidates.find(c => c.id === partnerForm.presidentId);
        const updatedSecretary = candidates.find(c => c.id === partnerForm.secretaryId);

        const updatedPartner = {
          ...prevPartner,
          ...partnerForm,
          presidentName: updatedPresident?.nome ?? prevPartner.presidentName,
          secretaryName: updatedSecretary?.nome ?? prevPartner.secretaryName,
        } as AssemblyDetailData;

        return isCurrentPagePrimary
          ? { ...prev, assembly2: updatedPartner }
          : { ...prev, assembly1: updatedPartner };
      });
      setIsEditingPartner(false);
    } catch (err) {
      console.error('Error saving partner assembly:', err);
    } finally {
      setSavingPartner(false);
    }
  };

  const handlePairAssembly = async (pairedId: string | null) => {
    if (!convocationDetail?.id) return;
    setSavingPairing(true);
    try {
      await axios.patch(`${API_BASE_URL}/convocations/${convocationDetail.id}`, {
        secondAssemblyId: pairedId,
      });
      if (pairedId) {
        const res = await axios.get<AssemblyDetailData>(`${API_BASE_URL}/assemblies/${pairedId}`);
        const a2 = res.data;
        setPartnerForm({
          id: a2.id,
          type: a2.type ?? '',
          subtype: (a2 as any).subtype ?? '',
          referenceNumber: a2.referenceNumber ?? 0,
          referenceYear: a2.referenceYear ?? new Date().getFullYear(),
          firstCallDate: a2.firstCallDate ?? '',
          firstCallTime: (a2 as any).firstCallTime ?? '',
          endTime: a2.endTime ?? '',
          convocationDate: (a2 as any).convocationDate ?? '',
          location: a2.location ?? '',
          mode: a2.mode ?? 'in_person',
          meetLink: (a2 as any).meetLink ?? '',
          presidentId: a2.presidentId ?? '',
          secretaryId: a2.secretaryId ?? '',
          modalityFormulaPrima: a2.modalityFormulaPrima ?? '',
          modalityFormulaApertura: a2.modalityFormulaApertura ?? '',
          assemblyStatus: (a2 as any).assemblyStatus ?? '',
          secondCallDate: (a2 as any).secondCallDate ?? '',
          secondCallTime: (a2 as any).secondCallTime ?? '',
          googleDocsLink: a2.googleDocsLink ?? '',
          pdfLink: a2.pdfLink ?? '',
          notes: a2.notes ?? '',
        });
        setConvocationDetail((prev) => prev ? { ...prev, secondAssemblyId: pairedId, assembly2: a2 } : null);
      } else {
        setConvocationDetail((prev) => prev ? { ...prev, secondAssemblyId: null, assembly2: null } : null);
      }
      setPairingDropdownOpen(false);
    } catch (err) {
      console.error('Error pairing assembly:', err);
    } finally {
      setSavingPairing(false);
    }
  };

  const handleSwapConvocationRoles = async () => {
    if (!convocationDetail?.id || !convocationDetail.secondAssemblyId) return;
    setSavingPairing(true);
    try {
      const newPrimaryId = convocationDetail.secondAssemblyId;
      const newSecondaryId = convocationDetail.assemblyId;
      await axios.patch(`${API_BASE_URL}/convocations/${convocationDetail.id}`, {
        assemblyId: newPrimaryId,
        secondAssemblyId: newSecondaryId,
      });

      // Reload the updated data
      const [res1, res2] = await Promise.all([
        axios.get<AssemblyDetailData>(`${API_BASE_URL}/assemblies/${newPrimaryId}`),
        axios.get<AssemblyDetailData>(`${API_BASE_URL}/assemblies/${newSecondaryId}`),
      ]);

      setConvocationDetail((prev) => prev ? {
        ...prev,
        assemblyId: newPrimaryId,
        secondAssemblyId: newSecondaryId,
        assembly1: res1.data,
        assembly2: res2.data,
      } : null);
    } catch (err) {
      console.error('Error swapping convocation roles:', err);
    } finally {
      setSavingPairing(false);
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p>{t('assemblies.loadingDetails', { defaultValue: 'Loading assembly details...' })}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-900/20 border border-red-800 text-red-400 p-6 rounded-xl flex items-center space-x-4">
        <AlertCircle size={28} />
        <div>
          <h3 className="font-bold text-lg">{t('common.status.error')}</h3>
          <p>{error ?? t('assemblies.notFound')}</p>
          <button onClick={() => navigate('/assemblies')} className="mt-2 text-sm underline hover:text-red-300">{t('assemblies.backToList', { defaultValue: 'Back to list' })}</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="flex items-center gap-1 mt-1 shrink-0">
              <button onClick={() => navigate('/assemblies')} className="p-2 hover:bg-slate-800 rounded-full transition-colors" title={t('assemblies.backToList', { defaultValue: 'Back to list' })}>
                <ArrowLeft size={20} className="text-slate-400" />
              </button>
              <div className="flex items-center bg-slate-800/40 rounded-lg p-0.5 border border-slate-700/50">
                <button
                  onClick={() => prevAssembly && navigate(`/assemblies/${prevAssembly.id}`)}
                  disabled={!prevAssembly}
                  className="p-1.5 hover:bg-slate-700 rounded-md transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                  title={prevAssembly ? getAssemblyLabel(prevAssembly.id) : undefined}
                >
                  <ChevronLeft size={16} className="text-slate-300" />
                </button>
                <button
                  onClick={() => nextAssembly && navigate(`/assemblies/${nextAssembly.id}`)}
                  disabled={!nextAssembly}
                  className="p-1.5 hover:bg-slate-700 rounded-md transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                  title={nextAssembly ? getAssemblyLabel(nextAssembly.id) : undefined}
                >
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              </div>
            </div>
            <div className={isEditingPrimary ? 'flex-1' : ''}>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <FileText className="text-purple-400 shrink-0" size={20} />
                {convocationDetail && (
                  convocationDetail.assemblyId === id
                    ? <span className="text-xs font-black uppercase tracking-widest border rounded px-1.5 py-0.5 text-purple-400 border-purple-700">1a conv.</span>
                    : <span className="text-xs font-black uppercase tracking-widest border rounded px-1.5 py-0.5 text-teal-400 border-teal-700">2a conv.</span>
                )}
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
                {data.type === 'board_council'
                  ? `${t('assemblies.types.board_council')} n.${data.referenceNumber}${data.subtype === 'extraordinary' ? ' — Straordinaria' : ''}`
                  : data.type === 'constitution'
                    ? t('assemblies.types.constitution')
                    : `${data.type === 'extraordinary' ? t('assemblies.types.extraordinary') : t('assemblies.types.ordinary')} n.${data.referenceNumber}${data.referenceYear ? `/${data.referenceYear}` : ''}${data.subtype && data.subtype !== 'generic' ? ` — ${{ statute_modification: 'Modifica Statuto', dissolution: 'Scioglimento', merger_split: 'Fusione/Scissione' }[data.subtype] ?? ''}` : ''}`
                }
              </h1>
              {/* Filing reminder banners for extraordinary subtypes */}
              {data.type === 'extraordinary' && data.subtype === 'statute_modification' && (
                <div className="flex items-start gap-2 bg-amber-900/10 border border-amber-800/30 rounded-lg px-3 py-2 mt-2 text-xs text-amber-300">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <span><strong>Adempimento:</strong> Registrare le modifiche statutarie presso l'Agenzia delle Entrate entro 30 giorni dalla delibera.</span>
                </div>
              )}
              {data.type === 'extraordinary' && data.subtype === 'dissolution' && (
                <div className="flex items-start gap-2 bg-red-900/10 border border-red-800/30 rounded-lg px-3 py-2 mt-2 text-xs text-red-300">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <span><strong>Adempimento:</strong> Comunicare la delibera di scioglimento al RUNTS e all'Agenzia delle Entrate entro 30 giorni.</span>
                </div>
              )}
              {data.type === 'extraordinary' && data.subtype === 'merger_split' && (
                <div className="flex items-start gap-2 bg-amber-900/10 border border-amber-800/30 rounded-lg px-3 py-2 mt-2 text-xs text-amber-300">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <span><strong>Adempimento:</strong> Comunicare la delibera di fusione/scissione al RUNTS entro 30 giorni dalla delibera.</span>
                </div>
              )}
              {(() => {
                const isPaired = !!convocationDetail?.secondAssemblyId;
                const isCurrentPrimary = convocationDetail ? convocationDetail.assemblyId === id : true;
                const assembly1 = isPaired ? (isCurrentPrimary ? data : convocationDetail?.assembly1) : null;
                const assembly2 = isPaired ? (isCurrentPrimary ? convocationDetail?.assembly2 : data) : null;

                const AssemblyCard = ({ assembly, label, color }: { assembly: AssemblyDetailData; label: string; color: 'purple' | 'teal' | 'slate' }) => {
                  const isCurrent = assembly.id === id;
                  const borderCls = color === 'purple' ? 'border-purple-800/50' : color === 'teal' ? 'border-teal-800/50' : 'border-slate-700/50';
                  const highlightCls = isCurrent
                    ? color === 'purple' ? 'ring-2 ring-purple-600/60 bg-purple-950/20' : color === 'teal' ? 'ring-2 ring-teal-600/60 bg-teal-950/20' : ''
                    : 'hover:border-slate-500 cursor-pointer hover:bg-slate-800/80 transition-colors';
                  const badgeCls = color === 'purple' ? 'bg-purple-700 text-purple-100' : color === 'teal' ? 'bg-teal-700 text-teal-100' : 'bg-slate-700 text-slate-300';
                  const callDate = assembly.firstCallDate ?? assembly.convocationDate;
                  const inner = (
                    <>
                      {isPaired && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`${badgeCls} text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider`}>{label}</span>
                          <span className="text-slate-500 text-xs">n.{assembly.referenceNumber}{assembly.referenceYear ? `/${assembly.referenceYear}` : ''}</span>
                          {isCurrent && <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">pagina corrente</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-slate-300 text-sm">
                        <Calendar size={13} className="text-blue-400 shrink-0" />
                        <span><span className="text-white font-semibold">{callDate ? formatLongDate(callDate) : t('common.dateNotSet')}</span>{assembly.firstCallTime ? ` · ${assembly.firstCallTime}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                        <MapPin size={12} className="shrink-0" />
                        <span>{assembly.location}</span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-400 text-xs mt-1 flex-wrap">
                        <span className="flex items-center gap-1"><User size={12} className="shrink-0" />{t('common.fields.president')}: <span className="text-slate-200 font-semibold ml-1">{assembly.presidentName}</span></span>
                        <span className="flex items-center gap-1"><User size={12} className="shrink-0" />{t('common.fields.secretary')}: <span className="text-slate-200 font-semibold ml-1">{assembly.secretaryName}</span></span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <ModeBadge assembly={assembly} modalityOptions={modalityOptions} />
                        {assembly.meetLink && (
                          <a href={assembly.meetLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors text-[10px]">
                            <Video size={11} className="shrink-0" /> {t('common.fields.meetLink', { defaultValue: 'Link riunione' })}
                          </a>
                        )}
                        {!isCurrent && <span className="ml-auto text-[10px] text-slate-500 flex items-center gap-1"><ArrowLeft size={10} className="rotate-180" /> Vai alla pagina</span>}
                      </div>
                    </>
                  );
                  return isCurrent ? (
                    <div className={`bg-slate-800/50 border ${borderCls} ${highlightCls} rounded-lg px-4 py-3`}>{inner}</div>
                  ) : (
                    <div role="button" onClick={() => navigate(`/assemblies/${assembly.id}`)} className={`bg-slate-800/50 border ${borderCls} ${highlightCls} rounded-lg px-4 py-3`}>{inner}</div>
                  );
                };

                return isPaired && assembly1 && assembly2 ? (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AssemblyCard assembly={assembly1 as AssemblyDetailData} label="1a Conv." color="purple" />
                    <AssemblyCard assembly={assembly2 as AssemblyDetailData} label="2a Conv." color="teal" />
                  </div>
                ) : (
                  <div className="mt-3">
                    <AssemblyCard assembly={data} label="" color="slate" />
                  </div>
                );
              })()}
              <div className="mt-3 flex items-center gap-2">
                {hasPermission(PERMISSIONS.assembliesEdit) && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-white hover:bg-red-900/40 border border-red-900/50 hover:border-red-700 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                    {t('common.actions.delete')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* PAIRED ASSEMBLY PANEL */}
        {convocationDetail && (
          <div id="convocazioni-panel" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden scroll-mt-24">
            <ConvocationMetaPanel
              convocationDetail={convocationDetail}
              onConvocationDetailChange={setConvocationDetail}
              onSwapRoles={handleSwapConvocationRoles}
              isSwappingRoles={savingPairing}
            />

            {/* Two-column assembly editor */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
              {(() => {
                const isCurrentPrimary = convocationDetail.assemblyId === id;
                const otherAssembly = isCurrentPrimary ? convocationDetail.assembly2 : convocationDetail.assembly1;

                return (
                  <>
                    {/* LEFT COLUMN: The assembly we are currently viewing */}
                    <div className={`p-6 rounded-l-xl ${isCurrentPrimary ? 'bg-purple-950/10 ring-1 ring-inset ring-purple-900/30' : 'bg-teal-950/10 ring-1 ring-inset ring-teal-900/30'}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`text-xs font-black uppercase tracking-widest border rounded px-1.5 py-0.5 ${isCurrentPrimary ? 'text-purple-400 border-purple-700' : 'text-teal-400 border-teal-700'}`}>
                          {isCurrentPrimary ? '1a conv.' : '2a conv.'}
                        </span>
                        <span className="text-sm font-semibold text-slate-200">{getAssemblyLabel(id)}</span>
                        <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">pagina corrente</span>
                      </div>

                      <PrimaryAssemblyEditor
                        isEditing={isEditingPrimary}
                        form={coreForm}
                        setForm={setCoreForm}
                        data={data}
                        loading={updatingPrimary}
                        onSave={handleSavePrimary}
                        onToggleEdit={setIsEditingPrimary}
                        candidates={candidates}
                        candidatesLoading={candidatesLoading}
                        addresses={addresses}
                        modalityOptions={modalityOptions}
                      />
                    </div>

                    {/* RIGHT COLUMN: The other assembly if linked */}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`text-xs font-black uppercase tracking-widest border rounded px-1.5 py-0.5 ${!isCurrentPrimary ? 'text-purple-400 border-purple-700' : 'text-teal-400 border-teal-700'}`}>
                          {!isCurrentPrimary ? '1a conv.' : '2a conv.'}
                        </span>

                        <AssemblyPairingManager
                          isCurrentPrimary={isCurrentPrimary}
                          otherAssembly={otherAssembly}
                          isDropdownOpen={pairingDropdownOpen}
                          dropdownRef={pairingDropdownRef}
                          savingPairing={savingPairing}
                          candidates={sortedAssemblies}
                          currentId={id!}
                          onToggleDropdown={setPairingDropdownOpen}
                          onPairAssembly={handlePairAssembly}
                          getAssemblyLabel={getAssemblyLabel}
                        />
                      </div>



                      <SecondaryAssemblyEditor
                        isEditing={isEditingPartner}
                        otherAssembly={otherAssembly}
                        form={partnerForm}
                        setForm={setPartnerForm}
                        loading={savingPartner}
                        onSave={handleSavePartnerAssembly}
                        onToggleEdit={setIsEditingPartner}
                        candidates={candidates}
                        candidatesLoading={candidatesLoading}
                        addresses={addresses}
                        modalityOptions={modalityOptions}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* SHARED ODG */}
        <AgendaItemsList
          convocationDetail={convocationDetail}
          onConvocationDetailChange={setConvocationDetail}
          testoVarie={genConfig.testoVarie}
          onTestoVarieChange={setTestoVarie}
          candidates={candidates}
          candidatesLoading={candidatesLoading}
        />

        {/* Membership Links */}
        {id && hasPermission(PERMISSIONS.peopleView) && (
          <MemberLinksPanel id={id} assemblyDate={data?.firstCallDate ?? ''} />
        )}

        {/* Attendance */}
        {id && hasPermission(PERMISSIONS.assembliesView) && (
          <AttendancePanel id={id} onRecordsChange={() => {}} />
        )}

      <DeleteAssemblyModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await axios.delete(`${API_BASE_URL}/assemblies/${id}`);
            navigate('/assemblies');
          } catch {
            setDeleting(false);
            setConfirmDelete(false);
          }
        }}
        isDeleting={deleting}
      />

      <DocumentGenerationPanel
        assemblyId={id}
        data={data}
        convocationDetail={convocationDetail}
        genConfig={genConfig}
        onGenConfigChange={setConfig}
      />
      </div>
    </>
  );
};

export default AssemblyDetail;
