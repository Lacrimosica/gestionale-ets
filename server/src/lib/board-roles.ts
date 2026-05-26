/**
 * Board member role definitions.
 * All identifiers are in English, translations happen at UI layer.
 */

export const BOARD_ROLES = {
  PRESIDENT: 'president',
  VICE_PRESIDENT: 'vice_president',
  TREASURER: 'treasurer',
  SECRETARY: 'secretary',
  COUNCILOR: 'councilor',
} as const;

export type BoardRole = typeof BOARD_ROLES[keyof typeof BOARD_ROLES];

export const BOARD_ROLE_VALUES = Object.values(BOARD_ROLES);

/**
 * Normalize board role from any format (Italian/English/mixed case) to standard enum.
 */
export const normalizeRole = (role: string): BoardRole | null => {
  const normalized = role?.toLowerCase().trim() || '';

  if (normalized.includes('president') || normalized.includes('presidente')) {
    if (!normalized.includes('vice') && !normalized.includes('vicepresident')) {
      return BOARD_ROLES.PRESIDENT;
    }
  }

  if (normalized.includes('vice') || normalized.includes('vicepresidente')) {
    return BOARD_ROLES.VICE_PRESIDENT;
  }

  if (normalized.includes('treasurer') || normalized.includes('tesoriere')) {
    return BOARD_ROLES.TREASURER;
  }

  if (normalized.includes('secretary') || normalized.includes('segretario')) {
    return BOARD_ROLES.SECRETARY;
  }

  if (normalized.includes('councilor') || normalized.includes('consigliere')) {
    return BOARD_ROLES.COUNCILOR;
  }

  return null;
};

/**
 * Check if a role value is valid.
 */
export const isValidRole = (role: unknown): role is BoardRole => {
  return typeof role === 'string' && BOARD_ROLE_VALUES.includes(role as BoardRole);
};
