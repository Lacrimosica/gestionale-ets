import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useConvocations } from './useConvocations';
import { API_BASE_URL } from '../config';
import type {
  AssemblyDetailData,
  AssemblySummary,
  ConvocationDetail,
} from '../types/assembly';
import { formatDate } from '../lib/date-utils';

export interface UseAssemblyDetailReturn {
  id?: string;
  data: AssemblyDetailData | null;
  allAssemblies: AssemblySummary[];
  linkedAssemblies: Record<string, AssemblyDetailData | null>;
  convocationDetail: ConvocationDetail | null;
  loading: boolean;
  error: string | null;
  sortedAssemblies: AssemblySummary[];
  getAssemblyLabel: (assemblyId?: string | null) => string;
  coreForm: Partial<AssemblyDetailData> & { convocationDate: string };
  setCoreForm: (form: Partial<AssemblyDetailData> & { convocationDate: string }) => void;
  partnerForm: Partial<AssemblyDetailData> & { id: string; convocationDate: string };
  setPartnerForm: (form: Partial<AssemblyDetailData> & { id: string; convocationDate: string }) => void;
  setConvocationDetail: Dispatch<SetStateAction<ConvocationDetail | null>>;
}

export const useAssemblyDetail = (): UseAssemblyDetailReturn => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AssemblyDetailData | null>(null);
  const [allAssemblies, setAllAssemblies] = useState<AssemblySummary[]>([]);
  const [linkedAssemblies, setLinkedAssemblies] = useState<Record<string, AssemblyDetailData | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convocationDetail, setConvocationDetail] = useState<ConvocationDetail | null>(null);

  const [coreForm, setCoreForm] = useState<Partial<AssemblyDetailData> & { convocationDate: string }>({
    type: '',
    subtype: '' as string,
    firstCallDate: '',
    firstCallTime: '',
    location: '',
    mode: '',
    modalityFormulaPrima: '',
    modalityFormulaApertura: '',
    meetLink: '',
    presidentId: '',
    secretaryId: '',
    referenceNumber: 0,
    referenceYear: 0,
    totalNumber: 0,
    googleDocsLink: '',
    pdfLink: '',
    depositedOnRunts: false,
    runtsDepositDate: '',
    endTime: '',
    notes: '',
    convocationDate: '',
  });

  const [partnerForm, setPartnerForm] = useState<Partial<AssemblyDetailData> & { id: string; convocationDate: string }>({
    id: '',
    type: '',
    subtype: '',
    referenceNumber: 0,
    referenceYear: 0,
    firstCallDate: '',
    firstCallTime: '',
    endTime: '',
    convocationDate: '',
    location: '',
    mode: 'in_person',
    meetLink: '',
    presidentId: '',
    secretaryId: '',
    modalityFormulaPrima: '',
    modalityFormulaApertura: '',
    assemblyStatus: '',
    secondCallDate: '',
    secondCallTime: '',
    googleDocsLink: '',
    pdfLink: '',
    notes: '',
  });

  const { convocations } = useConvocations(id ?? undefined);

  // Load all assemblies for navigation
  useEffect(() => {
    axios
      .get<AssemblySummary[]>(`${API_BASE_URL}/assemblies`)
      .then((res) => setAllAssemblies(res.data))
      .catch(() => undefined);
  }, []);

  // Main assembly data fetch
  const fetchAssemblyData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/assemblies/${id}`);
      const assembly = res.data as AssemblyDetailData;
      setData(assembly);
      setLinkedAssemblies((prev) => ({ ...prev, [assembly.id]: assembly }));

      // Load convocation detail if this assembly has one
      if (assembly.convocationId) {
        axios
          .get<ConvocationDetail>(`${API_BASE_URL}/convocations/${assembly.convocationId}`)
          .then(({ data: convDetail }) => {
            // Parse workflowData JSON strings
            const items = convDetail.agendaItems.map((item: any) => ({
              ...item,
              workflowData: item.workflowData
                ? typeof item.workflowData === 'string'
                  ? JSON.parse(item.workflowData)
                  : item.workflowData
                : null,
            }));
            setConvocationDetail({ ...convDetail, agendaItems: items });

            // Initialize partner form from the OTHER assembly
            const isCurrentPagePrimary = convDetail.assemblyId === assembly.id;
            const partnerAssemblyData = isCurrentPagePrimary ? convDetail.assembly2 : convDetail.assembly1;
            if (partnerAssemblyData) {
              const ap = partnerAssemblyData;
              setPartnerForm({
                id: ap.id,
                type: ap.type ?? '',
                subtype: (ap as any).subtype ?? '',
                referenceNumber: ap.referenceNumber ?? 0,
                referenceYear: ap.referenceYear ?? new Date().getFullYear(),
                firstCallDate: ap.firstCallDate ?? '',
                firstCallTime: (ap as any).firstCallTime ?? '',
                location: ap.location ?? '',
                mode: ap.mode ?? 'in_person',
                meetLink: (ap as any).meetLink ?? '',
                presidentId: ap.presidentId ?? '',
                secretaryId: ap.secretaryId ?? '',
                modalityFormulaPrima: ap.modalityFormulaPrima ?? '',
                modalityFormulaApertura: ap.modalityFormulaApertura ?? '',
                assemblyStatus: (ap as any).assemblyStatus ?? '',
                secondCallDate: (ap as any).secondCallDate ?? '',
                secondCallTime: (ap as any).secondCallTime ?? '',
                googleDocsLink: ap.googleDocsLink ?? '',
                pdfLink: ap.pdfLink ?? '',
                endTime: (ap as any).endTime ?? '',
                notes: ap.notes ?? '',
                convocationDate: (ap as any).convocationDate ?? '',
              });
            }
          })
          .catch(() => undefined);
      }

      // Initialize core form
      setCoreForm({
        type: assembly.type,
        subtype: (assembly as any).subtype ?? '',
        firstCallDate: assembly.firstCallDate ?? '',
        firstCallTime: (assembly as any).firstCallTime ?? (assembly as any).oraFirstCall ?? '',
        location: assembly.location,
        mode: assembly.mode,
        modalityFormulaPrima: assembly.modalityFormulaPrima ?? '',
        modalityFormulaApertura: assembly.modalityFormulaApertura ?? '',
        meetLink: assembly.meetLink ?? '',
        presidentId: assembly.presidentId ?? '',
        secretaryId: assembly.secretaryId ?? '',
        referenceNumber: assembly.referenceNumber,
        referenceYear: assembly.referenceYear ?? new Date().getFullYear(),
        totalNumber: assembly.totalNumber,
        googleDocsLink: assembly.googleDocsLink ?? '',
        pdfLink: assembly.pdfLink ?? '',
        depositedOnRunts: !!(assembly as any).depositedOnRunts,
        runtsDepositDate: (assembly as any).runtsDepositDate ?? '',
        endTime: (assembly as any).endTime ?? '',
        notes: assembly.notes ?? '',
        convocationDate: assembly.convocationDate ?? '',
      });
    } catch {
      setError(t('assemblies.notFound', { defaultValue: 'Assembly not found' }));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchAssemblyData();
  }, [fetchAssemblyData]);

  // Load linked assemblies from convocations
  useEffect(() => {
    const idsToLoad = new Set<string>();
    if (id) idsToLoad.add(id);
    convocations.forEach((conv) => {
      idsToLoad.add(conv.assemblyId);
      if (conv.secondAssemblyId) idsToLoad.add(conv.secondAssemblyId);
    });

    const missing = [...idsToLoad].filter((assemblyId) => assemblyId && !linkedAssemblies[assemblyId]);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (assemblyId) => {
        const res = await axios.get<AssemblyDetailData>(`${API_BASE_URL}/assemblies/${assemblyId}`);
        return { assemblyId, data: res.data };
      })
    )
      .then((results) => {
        setLinkedAssemblies((prev) => {
          const next = { ...prev };
          results.forEach(({ assemblyId, data }) => {
            next[assemblyId] = data;
          });
          return next;
        });
      })
      .catch(() => undefined);
  }, [id, convocations, linkedAssemblies]);

  const sortedAssemblies = useMemo(
    () =>
      [...allAssemblies].sort((a, b) => {
        const da = a.firstCallDate ? new Date(a.firstCallDate).getTime() : 0;
        const db = b.firstCallDate ? new Date(b.firstCallDate).getTime() : 0;
        return db - da;
      }),
    [allAssemblies]
  );

  const getAssemblyLabel = (assemblyId?: string | null) => {
    if (!assemblyId) return '-';
    const assembly = allAssemblies.find((entry) => entry.id === assemblyId) ?? linkedAssemblies[assemblyId];
    if (!assembly) return assemblyId;
    const dateStr = formatDate(assembly.firstCallDate);

    if (assembly.type === 'board_council') {
      const base = `${t('assemblies.types.board_council')} n.${assembly.referenceNumber}`;
      return dateStr ? `${base} (${dateStr})` : base;
    }
    if (assembly.type === 'constitution') {
      return dateStr ? `${t('assemblies.types.constitution')} (${dateStr})` : t('assemblies.types.constitution');
    }
    const typeName =
      assembly.type === 'extraordinary' ? t('assemblies.types.extraordinary') : t('assemblies.types.ordinary');
    const yearPart = assembly.referenceYear ? `/${assembly.referenceYear}` : '';
    const base = `${typeName} n.${assembly.referenceNumber}${yearPart}`;
    return dateStr ? `${base} (${dateStr})` : base;
  };

  return {
    id,
    data,
    allAssemblies,
    linkedAssemblies,
    convocationDetail,
    loading,
    error,
    sortedAssemblies,
    getAssemblyLabel,
    coreForm,
    setCoreForm,
    partnerForm,
    setPartnerForm,
    setConvocationDetail,
  };
};
