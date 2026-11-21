import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import type { Candidate } from '../types/assembly';

/** Which people each member-picking workflow may choose from. */
const CANDIDATE_ENDPOINTS: Record<string, string> = {
  member_admission: '/documents/member-candidates',
  member_resignation: '/documents/active-members',
  member_exclusion: '/documents/active-members',
  board_election: '/documents/active-volunteers',
};

export const isMemberWorkflow = (workflowType?: string | null): boolean =>
  !!workflowType && workflowType in CANDIDATE_ENDPOINTS;

/**
 * Picker candidates per agenda workflow type. Each endpoint is fetched at most
 * once per hook instance, and only once a workflow that needs it is in use.
 *
 * @param workflowTypes workflow types currently on screen; non-member types are ignored.
 */
export const useWorkflowCandidates = (workflowTypes: ReadonlyArray<string | null | undefined>) => {
  // Keyed by endpoint; a missing key means "not loaded yet" (doubles as the loading flag).
  const [byEndpoint, setByEndpoint] = useState<Record<string, Candidate[]>>({});
  // Endpoints already fetched or in flight; a ref because it never affects rendering.
  const requested = useRef(new Set<string>());

  // A sorted string key keeps the effect from re-running when callers pass a new array each render.
  const neededKey = [...new Set(workflowTypes.flatMap((t) => (t && CANDIDATE_ENDPOINTS[t]) ? [CANDIDATE_ENDPOINTS[t]] : []))]
    .sort()
    .join('|');

  useEffect(() => {
    const missing = neededKey.split('|').filter((endpoint) => endpoint && !requested.current.has(endpoint));
    missing.forEach((endpoint) => {
      requested.current.add(endpoint);
      axios.get<Candidate[]>(`${API_BASE_URL}${endpoint}`)
        .then(({ data }) => setByEndpoint((prev) => ({ ...prev, [endpoint]: Array.isArray(data) ? data : [] })))
        .catch(() => setByEndpoint((prev) => ({ ...prev, [endpoint]: [] })));
    });
  }, [neededKey]);

  const candidatesFor = useCallback(
    (workflowType?: string | null): Candidate[] => {
      const endpoint = workflowType ? CANDIDATE_ENDPOINTS[workflowType] : undefined;
      return (endpoint && byEndpoint[endpoint]) || [];
    },
    [byEndpoint],
  );

  const loadingFor = useCallback(
    (workflowType?: string | null): boolean => {
      const endpoint = workflowType ? CANDIDATE_ENDPOINTS[workflowType] : undefined;
      return !!endpoint && byEndpoint[endpoint] === undefined;
    },
    [byEndpoint],
  );

  return { candidatesFor, loadingFor };
};
