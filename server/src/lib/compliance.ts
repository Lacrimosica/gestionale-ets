import { complianceDocumentFlag, complianceDocument, complianceRole, alertSuppression, person } from '../db/schema';

export const DOCUMENT_TYPES = {
  ndaDia: 'nda_dia',
  ndaDir: 'nda_dir',
  ndaHr: 'nda_hr',
  ndaTesoreria: 'nda_tesoreria',
  ndaIt: 'nda_it',
  privacy: 'privacy',
  enrollmentForm: 'enrollment_form',
  memberForm: 'member_form',
} as const;

export const ROLE_TYPES = {
  dialogue: 'dialogue',
  itTeam: 'it_team',
  itLead: 'it_lead',
  hrTeam: 'hr_team',
  treasuryTeam: 'treasury_team',
  explore: 'explore',
  bond: 'bond',
  social: 'social',
} as const;

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

export const documentLabel = (documentType: string) => {
  const labels: Record<string, string> = {
    [DOCUMENT_TYPES.ndaDia]: 'NDA Dialogue',
    [DOCUMENT_TYPES.ndaDir]: 'NDA Board',
    [DOCUMENT_TYPES.ndaHr]: 'NDA HR',
    [DOCUMENT_TYPES.ndaTesoreria]: 'NDA Treasury',
    [DOCUMENT_TYPES.ndaIt]: 'NDA IT',
    [DOCUMENT_TYPES.privacy]: 'Privacy',
    [DOCUMENT_TYPES.enrollmentForm]: 'Enrollment Form',
    [DOCUMENT_TYPES.memberForm]: 'Member Form',
  };
  return labels[documentType] ?? documentType;
};

export const roleLabel = (roleType: string) => {
  const labels: Record<string, string> = {
    [ROLE_TYPES.dialogue]: 'Dialogue',
    [ROLE_TYPES.itTeam]: 'IT',
    [ROLE_TYPES.itLead]: 'IT Lead',
    [ROLE_TYPES.hrTeam]: 'HR',
    [ROLE_TYPES.treasuryTeam]: 'Treasury',
    [ROLE_TYPES.explore]: 'Explore',
    [ROLE_TYPES.bond]: 'Bond',
    [ROLE_TYPES.social]: 'Social',
  };
  return labels[roleType] ?? roleType;
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

const requiredDocumentsForPerson = (personId: string, input: ComputeInput) => {
  const required = new Set<string>();
  const personRoles = input.roles.filter((role) => role.personId === personId && isRoleActive(role));
  const isBoard = input.activeBoardIds.has(personId);

  if (input.activeVolunteerIds.has(personId)) {
    required.add(DOCUMENT_TYPES.enrollmentForm);
    required.add(DOCUMENT_TYPES.privacy);
  }
  if (input.activeSocioIds.has(personId)) {
    required.add(DOCUMENT_TYPES.memberForm);
  }
  if (isBoard) {
    required.add(DOCUMENT_TYPES.ndaDir);
  }

  for (const role of personRoles) {
    switch (role.roleType) {
      case ROLE_TYPES.dialogue:
        required.add(DOCUMENT_TYPES.ndaDia);
        break;
      case ROLE_TYPES.itTeam:
        required.add(DOCUMENT_TYPES.ndaIt);
        break;
      case ROLE_TYPES.itLead:
        required.add(DOCUMENT_TYPES.ndaIt);
        required.add(DOCUMENT_TYPES.ndaDir);
        break;
      case ROLE_TYPES.hrTeam:
        if (!isBoard) required.add(DOCUMENT_TYPES.ndaHr);
        break;
      case ROLE_TYPES.treasuryTeam:
        if (!isBoard) required.add(DOCUMENT_TYPES.ndaTesoreria);
        break;
    }
  }

  return required;
};

export const computeComplianceAlerts = (input: ComputeInput) => {
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
    const requiredDocuments = requiredDocumentsForPerson(person.id, input);
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
      const missing = !currentDoc || (documentType === DOCUMENT_TYPES.privacy && currentDoc.version === PRIVACY_VERSIONS.without);
      if (!missing) continue;

      const code =
        documentType === DOCUMENT_TYPES.enrollmentForm
          ? 'missing_enrollment_form'
          : documentType === DOCUMENT_TYPES.memberForm
            ? 'missing_member_form'
            : documentType === DOCUMENT_TYPES.privacy
              ? 'privacy_missing'
              : `missing_nda_${documentType.replace('nda_', '')}`;

      alerts.push(buildAlert(person, {
        code,
        title: `${documentLabel(documentType)} missing`,
        description: `Missing required document: ${documentLabel(documentType)}.`,
        severity: documentType === DOCUMENT_TYPES.privacy ? 'warning' : 'critical',
        entityType: 'document',
        entityId: currentDoc?.id,
      }));
    }

    const privacyDoc = currentDocs.get(DOCUMENT_TYPES.privacy);
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

    const diaDoc = currentDocs.get(DOCUMENT_TYPES.ndaDia);
    if (
      requiredDocuments.has(DOCUMENT_TYPES.ndaDia) &&
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
          title: `${documentLabel(doc.documentType)}: ${flag.label}`,
          description: flag.note || `Problematic flag on document ${documentLabel(doc.documentType)}.`,
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
  const current = currentDocumentByType(documents).get(DOCUMENT_TYPES.privacy);
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
