import { complianceDocumentFlag, complianceDocument, complianceRole, alertSuppression, person, organizationSetting, consentRecord } from '../db/schema';
import { eq } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ComplianceDocumentTypeConfig {
  label: string;
  description: string;
  // List of consent type keys collected by this document (e.g. ['third_party', 'image_use'])
  consentTypes?: string[];
  /** @deprecated use consentTypes instead — kept for backwards compat with old saved rules */
  hasConsents?: boolean;
  versions?: string[];
  currentVersion?: string;
}

export interface ComplianceRoleConfig {
  label: string;
  description?: string;
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
 * Load compliance rules from the DB (organization_setting row).
 * Returns null if no rules are configured in the DB.
 */
export const loadRules = async (db: any): Promise<ComplianceRules> => {
  try {
    const setting = await db.select({ complianceRules: organizationSetting.complianceRules })
      .from(organizationSetting)
      .where(eq(organizationSetting.id, 'branding'))
      .get();

    if (setting?.complianceRules) {
      const parsed = JSON.parse(setting.complianceRules);
      if (parsed?.documentTypes && parsed?.roles && parsed?.baseRequirements) {
        return parsed as ComplianceRules;
      }
    }
  } catch {
    // rules not configured or malformed
  }
  return { documentTypes: {}, roles: {}, baseRequirements: { isVolunteer: [], isSocio: [], isBoard: [] } };
};


// ── Schema types ───────────────────────────────────────────────────────────────

type Person = typeof person.$inferSelect;
type Role = typeof complianceRole.$inferSelect;
type Document = typeof complianceDocument.$inferSelect;
type Flag = typeof complianceDocumentFlag.$inferSelect;
type Suppression = typeof alertSuppression.$inferSelect;
export type ConsentRecord = typeof consentRecord.$inferSelect;

export type ComputedAlert = {
  key: string;
  code: string;
  title: string;
  labelKey?: string; // The i18n key for the specific document/role related to this alert
  description: string;
  severity: 'critical' | 'warning' | 'info';
  group: string;
  personId: string;
  personName: string;
  entityType: 'person' | 'document' | 'role';
  entityId?: string;
  suppression?: Suppression | null;
};

type VolunteerPeriod = typeof import('../db/schema').volunteerPeriod.$inferSelect;

type ComputeInput = {
  people: Person[];
  activeVolunteerIds: Set<string>;
  activeSocioIds: Set<string>;
  activeBoardIds: Set<string>;
  roles: Role[];
  documents: Document[];
  flags: Flag[];
  suppressions: Suppression[];
  consentRecords: ConsentRecord[];
  volunteerPeriods?: VolunteerPeriod[];
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

export const documentLabel = (documentType: string, rules: ComplianceRules | null) => {
  if (!rules) return documentType;
  const config = rules.documentTypes[documentType];
  return config?.label ?? documentType;
};

export const roleLabel = (roleType: string, rules: ComplianceRules | null) => {
  if (!rules) return roleType;
  const config = rules.roles[roleType];
  return config?.label ?? roleType;
};

const groupForCode = (code: string) => {
  if (code.startsWith('missing_nda')) return 'compliance.groups.missing_nda';
  if (code.startsWith('missing_form')) return 'compliance.groups.missing_form';
  if (code.startsWith('privacy')) return 'compliance.groups.privacy';
  if (code === 'missing_tax_id') return 'compliance.groups.incomplete_profile';
  if (code === 'missing_contacts') return 'compliance.groups.missing_contacts';
  if (code.startsWith('document_flag')) return 'compliance.groups.problematic_documents';
  if (code.startsWith('document_version_outdated')) return 'compliance.groups.outdated_documents';
  if (code.startsWith('consent_')) return 'compliance.groups.consent';
  if (code.startsWith('volunteer_register_')) return 'compliance.groups.libro_volontari';
  return 'compliance.groups.other';
};

const buildAlert = (
  person: Person,
  partial: Omit<ComputedAlert, 'key' | 'personId' | 'personName' | 'group'> & { keySuffix?: string }
): ComputedAlert => ({
  key: `${person.id}:${partial.code}${partial.keySuffix ? `:${partial.keySuffix}` : ''}`,
  code: partial.code,
  title: partial.title,
  labelKey: partial.labelKey,
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

export const computeComplianceAlerts = (input: ComputeInput, rules: ComplianceRules | null) => {
  if (!rules) return [];

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

  // Index consent records by personId → consentType → latest record
  // "Latest" = most recently created (we only track the most recent status per type per person)
  const latestConsentByPersonAndType = new Map<string, Map<string, ConsentRecord>>();
  for (const record of input.consentRecords) {
    let byType = latestConsentByPersonAndType.get(record.personId);
    if (!byType) {
      byType = new Map();
      latestConsentByPersonAndType.set(record.personId, byType);
    }
    const existing = byType.get(record.consentType);
    if (!existing || record.createdAt > existing.createdAt) {
      byType.set(record.consentType, record);
    }
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
        title: 'compliance.alerts.missing_tax_id',
        description: 'Person is active as a volunteer but has no tax ID registered.',
        severity: 'critical',
        entityType: 'person',
      }));
    }

    if (!person.email && !person.phone) {
      alerts.push(buildAlert(person, {
        code: 'missing_contacts',
        title: 'compliance.alerts.missing_contacts',
        description: 'Both email and phone number are missing.',
        severity: 'warning',
        entityType: 'person',
      }));
    }

    const effectivelyMissing = new Set<string>();
    for (const documentType of requiredDocuments) {
      const currentDoc = currentDocs.get(documentType);
      if (!currentDoc) {
        effectivelyMissing.add(documentType);

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
          title: 'compliance.alerts.missing_document',
          labelKey: rules.documentTypes[documentType]?.label ?? documentType,
          description: rules.documentTypes[documentType]?.description ?? `Missing required document: ${documentType}.`,
          severity: documentType === 'privacy' ? 'warning' : 'critical',
          entityType: 'document',
          entityId: undefined,
        }));
        continue;
      }
    }

    for (const [documentType, typeConfig] of Object.entries(rules.documentTypes)) {
      if (!typeConfig.currentVersion) continue;
      if (effectivelyMissing.has(documentType)) continue;
      const currentDoc = currentDocs.get(documentType);
      if (!currentDoc || !currentDoc.version) continue;
      if (currentDoc.version === typeConfig.currentVersion) continue;
      alerts.push(buildAlert(person, {
        code: 'document_version_outdated',
        keySuffix: documentType,
        title: 'compliance.alerts.document_version_outdated',
        labelKey: typeConfig.label,
        description: `${typeConfig.description || documentType}: version ${currentDoc.version} registered, but ${typeConfig.currentVersion} is required.`,
        severity: 'warning',
        entityType: 'document',
        entityId: currentDoc.id,
      }));
    }

    // ── Consent alerts ─────────────────────────────────────────────────────────
    const personConsentByType = latestConsentByPersonAndType.get(person.id) ?? new Map<string, ConsentRecord>();

    for (const [documentType, typeConfig] of Object.entries(rules.documentTypes)) {
      // Resolve consent types for this doc type (supports both new consentTypes and legacy hasConsents)
      const consentTypes: string[] =
        typeConfig.consentTypes && typeConfig.consentTypes.length > 0
          ? typeConfig.consentTypes
          : typeConfig.hasConsents
            ? ['third_party', 'image_use']
            : [];

      if (consentTypes.length === 0) continue;
      if (!requiredDocuments.has(documentType)) continue;
      if (effectivelyMissing.has(documentType)) continue; // doc itself is missing — already alerted

      const currentDoc = currentDocs.get(documentType);
      if (!currentDoc) continue;

      for (const consentType of consentTypes) {
        const record = personConsentByType.get(consentType);

        if (!record) {
          // No consent record at all for this type
          alerts.push(buildAlert(person, {
            code: 'consent_not_recorded',
            keySuffix: `${documentType}:${consentType}`,
            title: 'compliance.alerts.consent_not_recorded',
            labelKey: typeConfig.label,
            description: `Consent "${consentType}" for document "${documentType}" has not been recorded.`,
            severity: 'warning',
            entityType: 'document',
            entityId: currentDoc.id,
          }));
        } else if (record.status === 'withdrawn') {
          alerts.push(buildAlert(person, {
            code: 'consent_withdrawn',
            keySuffix: `${documentType}:${consentType}`,
            title: 'compliance.alerts.consent_withdrawn',
            labelKey: typeConfig.label,
            description: `Consent "${consentType}" was withdrawn for document "${documentType}".`,
            severity: 'info',
            entityType: 'document',
            entityId: currentDoc.id,
          }));
        } else if (
          typeConfig.currentVersion &&
          record.policyVersion &&
          record.policyVersion !== typeConfig.currentVersion
        ) {
          // Consent was given on an older policy version
          alerts.push(buildAlert(person, {
            code: 'consent_outdated_version',
            keySuffix: `${documentType}:${consentType}`,
            title: 'compliance.alerts.consent_outdated_version',
            labelKey: typeConfig.label,
            description: `Consent "${consentType}" was recorded on policy version ${record.policyVersion}, but current version is ${typeConfig.currentVersion}.`,
            severity: 'warning',
            entityType: 'document',
            entityId: currentDoc.id,
          }));
        }
      }
    }

    for (const doc of personDocuments) {
      const documentFlags = (flagsByDocument.get(doc.id) ?? []).filter((flag) => flag.isProblematic === 1 && !flag.resolvedAt);
      for (const flag of documentFlags) {
        alerts.push(buildAlert(person, {
          code: 'document_flag',
          keySuffix: flag.id,
          title: 'compliance.alerts.document_flag',
          labelKey: rules.documentTypes[doc.documentType]?.label ?? doc.documentType,
          description: flag.note || flag.label || `Problematic flag on document ${doc.documentType}.`,
          severity: flag.severity === 'critical' ? 'critical' : flag.severity === 'info' ? 'info' : 'warning',
          entityType: 'document',
          entityId: doc.id,
        }));
      }
    }

    // ── Libro volontari cartaceo alerts ────────────────────────────────────────
    if (input.volunteerPeriods) {
      const personPeriods = input.volunteerPeriods.filter((vp) => vp.personId === person.id);
      const hasAnyPeriod = personPeriods.length > 0;
      const isActiveVolunteer = input.activeVolunteerIds.has(person.id);
      const inPhysicalRegister = boolValue(person.isInVolunteerRegistryPhysical ?? person.inLibroVolontariCartaceo);

      // Alert 1: active volunteer not recorded in physical register
      if (isActiveVolunteer && !inPhysicalRegister) {
        alerts.push(buildAlert(person, {
          code: 'volunteer_register_not_registered',
          title: 'compliance.alerts.volunteer_register_not_registered',
          description: 'Active volunteer is not recorded in the physical volunteer register (libro volontari cartaceo).',
          severity: 'critical',
          entityType: 'person',
        }));
      }

      // Alert 2: volunteer exited in DB but exit not recorded in physical register
      if (!isActiveVolunteer && inPhysicalRegister && hasAnyPeriod && !person.volunteerRegistryEndDate && !person.libroVolontariEndDate) {
        // Confirm at least one period has an exit date (i.e. the person actually exited, not just never active)
        const hasExitedPeriod = personPeriods.some((vp) => !!vp.exitDate);
        if (hasExitedPeriod) {
          alerts.push(buildAlert(person, {
            code: 'volunteer_register_exit_not_recorded',
            title: 'compliance.alerts.volunteer_register_exit_not_recorded',
            description: 'Volunteer has an exit date in the database but the physical register has not been updated with an exit date.',
            severity: 'warning',
            entityType: 'person',
          }));
        }
      }

      // Alert 3: start date mismatch between physical register and digital record
      const registryStartDate = person.volunteerRegistryStartDate ?? person.libroVolontariStartDate;
      if (inPhysicalRegister && registryStartDate && hasAnyPeriod) {
        const earliestEnrollment = personPeriods
          .map((vp) => vp.enrollmentDate)
          .sort()
          .at(0);
        if (earliestEnrollment && earliestEnrollment !== registryStartDate) {
          alerts.push(buildAlert(person, {
            code: 'volunteer_register_start_date_mismatch',
            title: 'compliance.alerts.volunteer_register_start_date_mismatch',
            description: `Start date in the physical register (${registryStartDate}) differs from the digital enrollment date (${earliestEnrollment}).`,
            severity: 'warning',
            entityType: 'person',
          }));
        }
      }

      // Alert 4: end date mismatch between physical register and digital record
      const registryEndDate = person.volunteerRegistryEndDate ?? person.libroVolontariEndDate;
      if (inPhysicalRegister && registryEndDate && hasAnyPeriod) {
        const latestExit = personPeriods
          .map((vp) => vp.exitDate)
          .filter(Boolean)
          .sort()
          .at(-1);
        if (latestExit && latestExit !== registryEndDate) {
          alerts.push(buildAlert(person, {
            code: 'volunteer_register_end_date_mismatch',
            title: 'compliance.alerts.volunteer_register_end_date_mismatch',
            description: `Exit date in the physical register (${registryEndDate}) differs from the digital exit date (${latestExit}).`,
            severity: 'warning',
            entityType: 'person',
          }));
        }
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

export const getPrivacyStatus = (documents: Document[], consentRecords: ConsentRecord[] = []) => {
  const current = currentDocumentByType(documents).get('privacy');
  if (!current) {
    return null;
  }

  // Build latest consent status per type from the provided records
  const latestByType = new Map<string, ConsentRecord>();
  for (const record of consentRecords) {
    const existing = latestByType.get(record.consentType);
    if (!existing || record.createdAt > existing.createdAt) {
      latestByType.set(record.consentType, record);
    }
  }

  const consentsByType: Record<string, { status: string; grantedAt: string | null; withdrawnAt: string | null; policyVersion: string | null }> = {};
  for (const [type, record] of latestByType) {
    consentsByType[type] = {
      status: record.status,
      grantedAt: record.grantedAt,
      withdrawnAt: record.withdrawnAt,
      policyVersion: record.policyVersion,
    };
  }

  return {
    version: current.version,
    consentsByType,
    documentId: current.id,
    driveUrl: current.driveUrl,
  };
};
