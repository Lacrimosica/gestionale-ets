import { complianceDocumentFlag, complianceDocument, complianceRole, alertSuppression, person, appSetting } from '../db/schema';
import staticRules from '../config/compliance_rules.json';
import { eq } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ComplianceDocumentTypeConfig {
  label: string;
  description: string;
  hasConsents?: boolean;
  versions?: string[];
}

export interface ComplianceRoleConfig {
  label: string;
  requiredDocuments?: string[];
  inherits?: string[];
}

export interface ComplianceRules {
  documentTypes: Record<string, ComplianceDocumentTypeConfig>;
  roles: Record<string, ComplianceRoleConfig>;
  baseRequirements: {
    isVolunteer: string[];
    isSocio: string[];
    isBoard: string[];
  };
}

// ── Rule Loader ────────────────────────────────────────────────────────────────

/**
 * Load compliance rules from the DB (app_setting row).
 * Falls back to the static JSON file if the DB has no stored rules.
 */
export const loadRules = async (db: any): Promise<ComplianceRules> => {
  try {
    const setting = await db.select({ complianceRules: appSetting.complianceRules })
      .from(appSetting)
      .where(eq(appSetting.id, 'branding'))
      .get();

    if (setting?.complianceRules) {
      const parsed = JSON.parse(setting.complianceRules);
      if (parsed?.documentTypes && parsed?.roles && parsed?.baseRequirements) {
        return parsed as ComplianceRules;
      }
    }
  } catch {
    // fall through to static JSON
  }
  return staticRules as ComplianceRules;
};

// ── Legacy constants (kept for backwards compat in routes) ─────────────────────

export const PRIVACY_VERSIONS = {
  without: 'WITHOUT',
  old: 'OLD',
  new: 'NEW',
} as const;

export const DIA_VERSIONS = {
  veryOld: 'VERY_OLD',
  old: 'OLD',
  new: 'NEW',
} as const;

// ── Schema types ───────────────────────────────────────────────────────────────

type Person = typeof person.$inferSelect;
type Role = typeof complianceRole.$inferSelect;
type Document = typeof complianceDocument.$inferSelect;
type Flag = typeof complianceDocumentFlag.$inferSelect;
type Suppression = typeof alertSuppression.$inferSelect;

export type ComputedAlert = {
  key: string;
  code: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  group: string;
  personId: string;
  personName: string;
  entityType: 'person' | 'document' | 'role';
  entityId?: string;
  suppression?: Suppression | null;
};

type ComputeInput = {
  people: Person[];
  activeVolunteerIds: Set<string>;
  activeSocioIds: Set<string>;
  activeBoardIds: Set<string>;
  roles: Role[];
  documents: Document[];
  flags: Flag[];
  suppressions: Suppression[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const boolValue = (value: number | null) => value === 1;

const todayIso = () => new Date().toISOString().split('T')[0];

export const isRoleActive = (role: Pick<Role, 'startDate' | 'endDate'>, today = todayIso()) => {
  const startsOk = !role.startDate || role.startDate <= today;
  const endsOk = !role.endDate || role.endDate >= today;
  return startsOk && endsOk;
};

export const isSuppressionActive = (suppression: Pick<Suppression, 'releasedAt' | 'untilDate'>, today = todayIso()) => {
  if (suppression.releasedAt) return false;
  if (!suppression.untilDate) return true;
  return suppression.untilDate >= today;
};

export const documentLabel = (documentType: string, rules: ComplianceRules) => {
  const config = rules.documentTypes[documentType];
  return config?.label ?? documentType;
};

export const roleLabel = (roleType: string, rules: ComplianceRules) => {
  const config = rules.roles[roleType];
  return config?.label ?? roleType;
};

const groupForCode = (code: string) => {
  if (code.startsWith('missing_nda')) return 'Missing NDAs';
  if (code.startsWith('missing_form')) return 'Missing Forms';
  if (code.startsWith('privacy')) return 'Privacy';
  if (code === 'missing_tax_id') return 'Incomplete Profile';
  if (code === 'missing_contacts') return 'Missing Contacts';
  if (code.startsWith('document_flag')) return 'Problematic Documents';
  return 'Other';
};

const buildAlert = (
  person: Person,
  partial: Omit<ComputedAlert, 'key' | 'personId' | 'personName' | 'group'> & { keySuffix?: string }
): ComputedAlert => ({
  key: `${person.id}:${partial.code}${partial.keySuffix ? `:${partial.keySuffix}` : ''}`,
  code: partial.code,
  title: partial.title,
  description: partial.description,
  severity: partial.severity,
  group: groupForCode(partial.code),
  personId: person.id,
  personName: `${person.firstName} ${person.lastName}`,
  entityType: partial.entityType,
  entityId: partial.entityId,
});

const currentDocumentByType = (documents: Document[]) => {
  const map = new Map<string, Document>();
  if (!Array.isArray(documents)) return map;

  for (const doc of documents) {
    if (!doc || !doc.documentType) continue;
    const existing = map.get(doc.documentType);
    const existingScore = existing ? `${existing.isCurrent}:${existing.signedAt ?? existing.updatedAt ?? ''}` : '';
    const nextScore = `${doc.isCurrent}:${doc.signedAt ?? doc.updatedAt ?? ''}`;
    if (!existing || nextScore > existingScore) {
      map.set(doc.documentType, doc);
    }
  }
  return map;
};

const getRequiredForRole = (roleType: string, rules: ComplianceRules, seen = new Set<string>()): string[] => {
  if (seen.has(roleType)) return [];
  seen.add(roleType);

  const config = rules.roles[roleType];
  if (!config) return [];

  let required: string[] = config.requiredDocuments || [];
  if (config.inherits) {
    for (const parent of config.inherits) {
      required = [...required, ...getRequiredForRole(parent, rules, seen)];
    }
  }
  return required;
};

const requiredDocumentsForPerson = (personId: string, input: ComputeInput, rules: ComplianceRules) => {
  const required = new Set<string>();
  const personRoles = input.roles.filter((role) => role.personId === personId && isRoleActive(role));

  if (input.activeVolunteerIds.has(personId)) {
    rules.baseRequirements.isVolunteer.forEach(d => required.add(d));
  }
  if (input.activeSocioIds.has(personId)) {
    rules.baseRequirements.isSocio.forEach(d => required.add(d));
  }
  if (input.activeBoardIds.has(personId)) {
    rules.baseRequirements.isBoard.forEach(d => required.add(d));
  }

  for (const role of personRoles) {
    getRequiredForRole(role.roleType, rules).forEach(d => required.add(d));
  }

  return required;
};

// ── Main exports ───────────────────────────────────────────────────────────────

export const computeComplianceAlerts = (input: ComputeInput, rules: ComplianceRules) => {
  const suppressionsByKey = new Map(
    input.suppressions
      .filter((suppression) => isSuppressionActive(suppression))
      .map((suppression) => [suppression.alertKey, suppression] as const)
  );

  const docsByPerson = new Map<string, Document[]>();
  for (const doc of input.documents) {
    const list = docsByPerson.get(doc.personId) ?? [];
    list.push(doc);
    docsByPerson.set(doc.personId, list);
  }

  const flagsByDocument = new Map<string, Flag[]>();
  for (const flag of input.flags) {
    const list = flagsByDocument.get(flag.documentId) ?? [];
    list.push(flag);
    flagsByDocument.set(flag.documentId, list);
  }

  const alerts: ComputedAlert[] = [];

  for (const person of input.people) {
    const personDocuments = docsByPerson.get(person.id) ?? [];
    const currentDocs = currentDocumentByType(personDocuments);
    const requiredDocuments = requiredDocumentsForPerson(person.id, input, rules);
    const isRelevant =
      input.activeVolunteerIds.has(person.id) ||
      input.activeSocioIds.has(person.id) ||
      input.activeBoardIds.has(person.id) ||
      input.roles.some((role) => role.personId === person.id && isRoleActive(role));

    if (!isRelevant) {
      continue;
    }

    if (input.activeVolunteerIds.has(person.id) && !person.taxId) {
      alerts.push(buildAlert(person, {
        code: 'missing_tax_id',
        title: 'Volunteer without Tax ID',
        description: 'Person is active as a volunteer but has no tax ID registered.',
        severity: 'critical',
        entityType: 'person',
      }));
    }

    if (!person.email && !person.phone) {
      alerts.push(buildAlert(person, {
        code: 'missing_contacts',
        title: 'Person without contact info',
        description: 'Both email and phone number are missing.',
        severity: 'warning',
        entityType: 'person',
      }));
    }

    for (const documentType of requiredDocuments) {
      const currentDoc = currentDocs.get(documentType);
      const missing = !currentDoc || (documentType === 'privacy' && currentDoc.version === PRIVACY_VERSIONS.without);
      if (!missing) continue;

      const code =
        documentType === 'enrollment_form'
          ? 'missing_enrollment_form'
          : documentType === 'member_form'
            ? 'missing_member_form'
            : documentType === 'privacy'
              ? 'privacy_missing'
              : `missing_nda_${documentType.replace('nda_', '')}`;

      alerts.push(buildAlert(person, {
        code,
        title: `${documentLabel(documentType, rules)} missing`,
        description: `Missing required document: ${documentLabel(documentType, rules)}.`,
        severity: documentType === 'privacy' ? 'warning' : 'critical',
        entityType: 'document',
        entityId: currentDoc?.id,
      }));
    }

    const privacyDoc = currentDocs.get('privacy');
    if (privacyDoc?.version === PRIVACY_VERSIONS.old) {
      alerts.push(buildAlert(person, {
        code: 'privacy_outdated',
        title: 'Privacy on OLD module',
        description: 'The registered privacy uses the previous module without the data retention clause.',
        severity: 'warning',
        entityType: 'document',
        entityId: privacyDoc.id,
      }));
    }

    const diaDoc = currentDocs.get('nda_dia');
    if (
      requiredDocuments.has('nda_dia') &&
      diaDoc &&
      diaDoc.version &&
      ([DIA_VERSIONS.veryOld, DIA_VERSIONS.old] as string[]).includes(diaDoc.version)
    ) {
      alerts.push(buildAlert(person, {
        code: 'nda_dia_outdated',
        title: 'NDA Dialogue outdated',
        description: `Person signed version ${diaDoc.version} of the Dialogue module.`,
        severity: 'warning',
        entityType: 'document',
        entityId: diaDoc.id,
      }));
    }

    for (const doc of personDocuments) {
      const documentFlags = (flagsByDocument.get(doc.id) ?? []).filter((flag) => flag.isProblematic === 1 && !flag.resolvedAt);
      for (const flag of documentFlags) {
        alerts.push(buildAlert(person, {
          code: 'document_flag',
          keySuffix: flag.id,
          title: `${documentLabel(doc.documentType, rules)}: ${flag.label}`,
          description: flag.note || `Problematic flag on document ${documentLabel(doc.documentType, rules)}.`,
          severity: flag.severity === 'critical' ? 'critical' : flag.severity === 'info' ? 'info' : 'warning',
          entityType: 'document',
          entityId: doc.id,
        }));
      }
    }
  }

  return alerts
    .map((alert) => ({
      ...alert,
      suppression: alert.key ? (suppressionsByKey.get(alert.key) ?? null) : null,
    }))
    .sort((a, b) => {
      const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      const aScore = severityOrder[a.severity] ?? 99;
      const bScore = severityOrder[b.severity] ?? 99;
      return aScore - bScore || (a.personName || '').localeCompare(b.personName || '');
    });
};

export const getPrivacyStatus = (documents: Document[]) => {
  const current = currentDocumentByType(documents).get('privacy');
  if (!current) {
    return null;
  }

  return {
    version: current.version,
    dataProcessingConsent: boolValue(current.dataProcessingConsent),
    thirdPartyCommunicationConsent: boolValue(current.thirdPartyCommunicationConsent),
    imageUseConsent: boolValue(current.imageUseConsent),
    documentId: current.id,
    driveUrl: current.driveUrl,
  };
};
