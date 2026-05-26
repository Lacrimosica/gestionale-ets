/**
 * Deployment mode enum and utilities.
 * Controls how organization creation is gated at the system level.
 */

export type DeploymentMode = 'single_org' | 'invite_only' | 'open' | 'closed';

/**
 * Parse the DEPLOYMENT_MODE env var into a safe enum value.
 * Falls back to 'single_org' if invalid or missing.
 * Backward compat: 'true' → 'open', 'false' → 'single_org'
 */
export function parseDeploymentMode(raw?: string): DeploymentMode {
  if (!raw) return 'single_org';

  const lower = raw.toLowerCase().trim();

  // Enum values
  if (lower === 'single_org' || lower === 'invite_only' || lower === 'open' || lower === 'closed') {
    return lower as DeploymentMode;
  }

  // Backward compat: ALLOW_ORG_CREATION
  if (lower === 'true') return 'open';
  if (lower === 'false') return 'single_org';

  // Unknown → safe default
  return 'single_org';
}

/**
 * Determine whether an organization can be created based on deployment mode.
 *
 * @param mode The deployment mode
 * @param orgCount Number of existing organizations (with isSetupComplete=1)
 * @param hasOrgCreationToken Whether the request carries a valid org-creation invite token
 * @returns true if org creation is allowed
 */
export function canCreateOrg(mode: DeploymentMode, orgCount: number, hasOrgCreationToken: boolean = false): boolean {
  switch (mode) {
    case 'closed':
      return false;

    case 'single_org':
      // Only if no org exists yet
      return orgCount === 0;

    case 'invite_only':
      // Either first org (none exist), or have a valid invite token
      return orgCount === 0 || hasOrgCreationToken;

    case 'open':
      // Anyone can create
      return true;

    default:
      // Safe default: deny
      return false;
  }
}

/**
 * Get a user-friendly description of what the deployment mode allows.
 */
export function getDeploymentModeDescription(mode: DeploymentMode): string {
  switch (mode) {
    case 'closed':
      return 'Organization creation is disabled.';
    case 'single_org':
      return 'Only one organization can exist.';
    case 'invite_only':
      return 'Additional organizations require an invitation.';
    case 'open':
      return 'Anyone can create a new organization.';
    default:
      return 'Unknown mode.';
  }
}

/**
 * Generate the organization_setting ID for a given organization.
 * Ensures the ID is unique per organization, preventing UNIQUE constraint violations
 * when multiple org creation requests happen concurrently.
 */
export function getOrganizationSettingId(orgId: string, key: string = 'branding'): string {
  return `${orgId}-${key}`;
}
