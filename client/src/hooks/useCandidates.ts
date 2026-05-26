import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import type { Candidate } from '../types/assembly';

interface UseCandidatesOptions {
  isOpen?: boolean;
  hasWorkflowItem?: boolean;
  isEditingPrimary?: boolean;
  isEditingPartner?: boolean;
}

export const useCandidates = (options: UseCandidatesOptions = {}) => {
  const { isOpen = false, hasWorkflowItem = false, isEditingPrimary = false, isEditingPartner = false } = options;
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  useEffect(() => {
    if (!isOpen && !hasWorkflowItem && !isEditingPrimary && !isEditingPartner) return;
    if (candidates.length > 0 || candidatesLoading) return;

    setCandidatesLoading(true);
    axios
      .get<Candidate[]>(`${API_BASE_URL}/documents/all-volunteers-with-status`)
      .then(({ data: cData }) => setCandidates(cData))
      .catch(() => {
        /* silent */
      })
      .finally(() => setCandidatesLoading(false));
  }, [isOpen, hasWorkflowItem, isEditingPrimary, isEditingPartner, candidates.length, candidatesLoading]);

  return { candidates, candidatesLoading };
};
