import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export type DeploymentMode = 'single_org' | 'invite_only' | 'open' | 'closed';

export interface SetupStatus {
  needsSetup: boolean;
  deploymentMode: DeploymentMode;
  orgCount: number;
  loading: boolean;
  error: boolean;
  // Backward compat
  allowOrgCreation: boolean;
}

export function useSetupStatus(): SetupStatus {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>('single_org');
  const [orgCount, setOrgCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/setup/status`);
        setNeedsSetup(response.data.needsSetup);
        setDeploymentMode(response.data.deploymentMode ?? 'single_org');
        setOrgCount(response.data.orgCount ?? 0);
        setError(false);
      } catch (err) {
        console.error('Error checking setup status:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    checkSetupStatus();
  }, []);

  // Backward compat: derive allowOrgCreation from deploymentMode
  const allowOrgCreation = deploymentMode !== 'single_org' && deploymentMode !== 'closed';

  return { needsSetup, deploymentMode, orgCount, loading, error, allowOrgCreation };
}
