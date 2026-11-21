import { useState, useEffect, useRef } from 'react';
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
  const [settled, setSettled] = useState(false);
  const requested = useRef(false);
  const wanted = isOpen || hasWorkflowItem || isEditingPrimary || isEditingPartner;
  // Loading is derived from "wanted but not yet settled", so no state is set
  // synchronously inside the effect.
  const candidatesLoading = wanted && !settled;

  useEffect(() => {
    if (!wanted || requested.current) return;
    requested.current = true;
    axios
      .get<Candidate[]>(`${API_BASE_URL}/documents/all-volunteers-with-status`)
      .then(({ data: cData }) => setCandidates(cData))
      .catch(() => {
        /* silent */
      })
      .finally(() => setSettled(true));
  }, [wanted]);

  return { candidates, candidatesLoading };
};
