import { sqliteTable, text, integer, unique, index } from 'drizzle-orm/sqlite-core';
import type { BoardRole } from '../lib/board-roles';

export const person = sqliteTable('person', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  taxId: text('tax_id'),
  email: text('email'),
  phone: text('phone'),
  birthDate: text('birth_date'), // ISO8601
  birthPlace: text('birth_place'),
  birthCountry: text('birth_country'),
  gender: text('gender'),
  profession: text('profession'),
  isStudent: integer('is_student').notNull().default(0),
  isEmployee: integer('is_employee').notNull().default(0),
  memberNumber: text('member_number'),
  notes: text('notes'),
  cfValidation: text('cf_validation'), // null = never checked, "OK", or JSON array of error strings
  userId: text('user_id'), // optional link to user account (FK to user.id)
  // Retention / data-lifecycle flags
  // Phase 5: Keeping old Italian names for backward compatibility during transition
  inLibroVolontariCartaceo: integer('in_libro_volontari_cartaceo').notNull().default(0),
  libroVolontariStartDate: text('libro_volontari_start_date'),
  libroVolontariEndDate: text('libro_volontari_end_date'),
  appearsInRuntsVerbale: integer('appears_in_runts_verbale').notNull().default(0), // computed
  // Phase 5: New English column names
  isInVolunteerRegistryPhysical: integer('is_in_volunteer_registry_physical').notNull().default(0),
  volunteerRegistryStartDate: text('volunteer_registry_start_date'),
  volunteerRegistryEndDate: text('volunteer_registry_end_date'),
  appearsInRuntsProceedings: integer('appears_in_runts_proceedings').notNull().default(0), // computed
  canBeRemoved: integer('can_be_removed').notNull().default(1),                    // computed; defaults to 1 (removable) — recompute anchors people down
  needsRegularization: integer('needs_regularization').notNull().default(0),       // computed
  isPresumedNonExistent: integer('is_presumed_non_existent').notNull().default(0), // explicitly marked as phantom/unverified record
  createdAt: text('created_at').notNull(), // ISO8601
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  taxIdOrgIdUnique: unique().on(table.orgId, table.taxId),
  orgIdIdx: index('idx_person_org_id').on(table.orgId),
}));

export const volunteerPeriod = sqliteTable('volunteer_period', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  personId: text('person_id').notNull().references(() => person.id),
  status: text('status').notNull(), // 'active' | 'inactive' | 'suspended' | 'resigned'
  statusId: text('status_id').references(() => volunteerStatus.id), // FK for Phase 3
  enrollmentDate: text('enrollment_date').notNull(),
  exitDate: text('exit_date'),
  exitReason: text('exit_reason'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_volunteer_period_org_id').on(table.orgId),
}));

export const memberPeriod = sqliteTable('member_period', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  personId: text('person_id').notNull().references(() => person.id),
  volunteerPeriodId: text('volunteer_period_id').notNull().references(() => volunteerPeriod.id),
  admissionDate: text('admission_date').notNull(),
  resignationDate: text('resignation_date'),
  exitReason: text('exit_reason'),
  articleReference: text('article_reference'),
  admissionAssemblyId: text('admission_assembly_id').references(() => assembly.id),
  exitAssemblyId: text('exit_assembly_id').references(() => assembly.id),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_member_period_org_id').on(table.orgId),
}));

export const boardGeneration = sqliteTable('board_generation', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  name: text('name').notNull(), // e.g. "2019-2020 (1°)"
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_board_generation_org_id').on(table.orgId),
}));

export const boardMember = sqliteTable('board_member', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  generationId: text('generation_id').notNull().references(() => boardGeneration.id),
  personId: text('person_id').notNull().references(() => person.id),
  role: text('role').$type<BoardRole>().notNull(), // 'president' | 'vice_president' | 'treasurer' | 'secretary' | 'councilor'
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_board_member_org_id').on(table.orgId),
}));

export const assembly = sqliteTable('assembly', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  type: text('type').notNull(), // 'ordinary' | 'extraordinary' | 'board_council' | 'constitution'
  typeId: text('type_id').references(() => assemblyType.id), // FK for Phase 2
  subtype: text('subtype'), // extraordinary: 'generic'|'statute_modification'|'dissolution'|'merger_split'; board_council: 'ordinary'|'extraordinary'
  subtypeId: text('subtype_id').references(() => assemblySubtype.id), // FK for Phase 2
  depositedOnRunts: integer('deposited_on_runts').notNull().default(0),
  runtsDepositDate: text('runts_deposit_date'),
  totalNumber: integer('total_number').notNull(),
  referenceNumber: integer('reference_number').notNull(), // Annual or mandate reset
  referenceYear: integer('reference_year'), // For Assemblies
  firstCallDate: text('first_call_date'), // Optional for CD
  firstCallTime: text('first_call_time'),
  secondCallDate: text('second_call_date'),
  secondCallTime: text('second_call_time'),
  location: text('location').notNull(),
  locationId: text('location_id').references(() => assemblyLocation.id), // FK for Phase 2
  mode: text('mode').notNull(), // 'in_person' | 'remote' | 'hybrid'
  modeId: text('mode_id').references(() => modeOption.id), // FK for Phase 2
  boardGenerationId: text('board_generation_id').references(() => boardGeneration.id),
  assemblyStatus: text('assembly_status'), // 'held' | 'deserted' | 'not_planned'
  statusId: text('status_id').references(() => assemblyStatus.id), // FK for Phase 2
  presidentId: text('president_id').references(() => person.id), // FK to person
  secretaryId: text('secretary_id').references(() => person.id), // FK to person
  notes: text('notes'),
  meetLink: text('meet_link'),
  googleDocsLink: text('google_docs_link'),
  pdfLink: text('pdf_link'),
  modalityFormulaPrima: text('modality_formula_prima'),
  firstCallModalityId: text('first_call_modality_id').references(() => convocationModalityOption.id), // FK for Phase 2
  modalityFormulaApertura: text('modality_formula_apertura'),
  openingModalityId: text('opening_modality_id').references(() => convocationModalityOption.id), // FK for Phase 2
  endTime: text('end_time'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_assembly_org_id').on(table.orgId),
}));

export const convocation = sqliteTable('convocation', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  assemblyId: text('assembly_id').notNull().references(() => assembly.id),
  secondAssemblyId: text('second_assembly_id').references(() => assembly.id),
  date: text('date').notNull(), // ISO8601 - the date appearing on the notice
  sendDeadline: text('send_deadline'), // optional - must be sent by this date
  content: text('content'), // body text
  documentLink: text('document_link'),
  proxyFormLink: text('proxy_form_link'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_convocation_org_id').on(table.orgId),
}));

export const agendaItem = sqliteTable('agenda_item', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  convocationId: text('convocation_id').references(() => convocation.id),
  number: integer('number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  resolution: text('resolution'),
  // null = free-text item; set to trigger expandable workflow panel in UI
  // values: 'member_admission' | 'member_resignation' | 'member_exclusion' | 'budget_approval' | 'board_election'
  workflowType: text('workflow_type'),
  // JSON: { budgetYear?: number, includeResignationAck?: boolean, voting?: any[] }
  // members are now stored in agenda_item_person junction table
  workflowData: text('workflow_data'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_agenda_item_org_id').on(table.orgId),
}));

export const agendaItemPerson = sqliteTable('agenda_item_person', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  agendaItemId: text('agenda_item_id').notNull().references(() => agendaItem.id),
  personId: text('person_id').notNull().references(() => person.id),
  role: text('role'), // e.g. 'candidate', 'excluded'
  createdAt: text('created_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_agenda_item_person_org_id').on(table.orgId),
}));

export const attendance = sqliteTable('attendance', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  assemblyId: text('assembly_id').notNull().references(() => assembly.id),
  personId: text('person_id').notNull().references(() => person.id),
  mode: text('mode').notNull(), // 'present' | 'remote' | 'proxy'
  modeId: text('mode_id').references(() => attendanceMode.id), // FK for Phase 3 (attendance-specific modes)
  delegatorId: text('delegator_id').references(() => person.id),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_attendance_org_id').on(table.orgId),
}));

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password'), // nullable for Google-only users until first login sets password
  googleId: text('google_id'),
  googleRefreshToken: text('google_refresh_token'),
  googleAccessToken: text('google_access_token'),
  googleTokenExpiry: text('google_token_expiry'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
});

export const organization = sqliteTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  slug: text('slug').notNull().unique(),
  authDomain: text('auth_domain').unique(),
  domainSignupMode: text('domain_signup_mode').notNull().default('invite_only'),
  tagline: text('tagline'),
  supportEmail: text('support_email'),
  logoDataUrl: text('logo_data_url'),
  isSetupComplete: integer('is_setup_complete').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const organizationUser = sqliteTable('organization_user', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  orgId: text('org_id').notNull().references(() => organization.id),
  role: text('role').notNull(),
  permissions: text('permissions').notNull().default('[]'),
  isOwner: integer('is_owner').notNull().default(0),
  joinedAt: text('joined_at').notNull(),
  invitedByUserId: text('invited_by_user_id'),
}, (table) => ({
  userOrgUnique: unique().on(table.userId, table.orgId),
}));

export const invite = sqliteTable('invite', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organization.id),
  email: text('email'),
  token: text('token').notNull().unique(),
  role: text('role').notNull(),
  permissionsOverride: text('permissions_override'),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  usedByUserId: text('used_by_user_id').references(() => user.id),
  createdAt: text('created_at').notNull(),
});

export const organizationSetting = sqliteTable('organization_setting', {
  id: text('id').primaryKey(),
  complianceRules: text('compliance_rules'), // JSON blob – nullable, falls back to static JSON file
  // Document generation settings
  city: text('city'),
  statuteArticleConvocation: text('statute_article_convocation'),
  statuteArticleProxies: text('statute_article_proxies'),
  statuteArticleMembers: text('statute_article_members'),
  statuteArticleBoardVote: text('statute_article_board_vote'),
  statuteArticleBoardElection: text('statute_article_board_election'),
  maxProxies: integer('max_proxies'),
  outputFolderId: text('output_folder_id'),
  templateConvocationId: text('template_convocation_id'),
  templateMinutes1aId: text('template_minutes_1a_id'),
  templateMinutes2aId: text('template_minutes_2a_id'),
  templateConvocationExtraordinaryStatuteId: text('template_convocation_extraordinary_statute_id'),
  templateConvocationExtraordinaryDissolutionId: text('template_convocation_extraordinary_dissolution_id'),
  templateConvocationBoardId: text('template_convocation_board_id'),
  templateMinutesBoardId: text('template_minutes_board_id'),
  // Phase 5: Keeping old Italian name for backward compatibility during transition
  varieDefaultText: text('varie_default_text'),
  // Phase 5: New English column name
  miscellaneousDefaultText: text('miscellaneous_default_text'),
  orgId: text('org_id'), // nullable, no FK constraint per migration 0049
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

export const userSetting = sqliteTable('user_setting', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  theme: text('theme').notNull().default('dark-slate'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const convocationModalityOption = sqliteTable('convocation_modality_option', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'convocation' | 'minutes_opening'
  mode: text('mode'), // 'in_person' | 'remote' | 'hybrid' | 'any'
  modeId: text('mode_id').references(() => modeOption.id), // FK for Phase 2
  label: text('label').notNull(),
  value: text('value').notNull(),
  isDefault: integer('is_default').notNull().default(0),
  orgId: text('org_id'), // nullable, no FK constraint per migration 0048
  createdAt: text('created_at').notNull(),
});

export const complianceRole = sqliteTable('compliance_role', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  personId: text('person_id').notNull().references(() => person.id),
  roleType: text('role_type').notNull(),
  roleTypeId: text('role_type_id').references(() => complianceRoleType.id), // FK for Phase 4
  startDate: text('start_date'),
  endDate: text('end_date'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_compliance_role_org_id').on(table.orgId),
}));

export const complianceDocument = sqliteTable('compliance_document', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  personId: text('person_id').notNull().references(() => person.id),
  documentType: text('document_type').notNull(),
  documentTypeId: text('document_type_id').references(() => documentType.id), // FK for Phase 4
  version: text('version'),
  driveUrl: text('drive_url'),
  signedAt: text('signed_at'),
  effectiveFrom: text('effective_from'),
  effectiveTo: text('effective_to'),
  isCurrent: integer('is_current').notNull().default(1),
  isSigned: integer('is_signed').notNull().default(0),
  isDated: integer('is_dated').notNull().default(0),
  isComplete: integer('is_complete').notNull().default(1),
  isDigital: integer('is_digital').notNull().default(1),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_compliance_document_org_id').on(table.orgId),
}));

export const complianceDocumentFlag = sqliteTable('compliance_document_flag', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  documentId: text('document_id').notNull().references(() => complianceDocument.id),
  code: text('code').notNull(),
  label: text('label').notNull(),
  severity: text('severity').notNull().default('warning'),
  isProblematic: integer('is_problematic').notNull().default(1),
  note: text('note'),
  resolvedAt: text('resolved_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_compliance_document_flag_org_id').on(table.orgId),
}));

export const consentRecord = sqliteTable('consent_record', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  personId: text('person_id').notNull().references(() => person.id),
  documentId: text('document_id').references(() => complianceDocument.id),
  // 'third_party' | 'image_use' | any future type — extensible without schema changes
  consentType: text('consent_type').notNull(),
  // 'granted' | 'withdrawn' | 'pending'
  status: text('status').notNull().default('pending'),
  statusId: text('status_id').references(() => consentStatus.id), // FK for Phase 4
  grantedAt: text('granted_at'),
  withdrawnAt: text('withdrawn_at'),
  // Which version of the privacy policy was in effect when consent was collected
  policyVersion: text('policy_version'),
  // 'written_form' | 'digital_checkbox' | 'verbal' | 'email'
  collectionMethod: text('collection_method'),
  collectionMethodId: text('collection_method_id').references(() => collectionMethod.id), // FK for Phase 4
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_consent_record_org_id').on(table.orgId),
}));

export const documentGenerationLog = sqliteTable('document_generation_log', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  assemblyId: text('assembly_id').references(() => assembly.id),
  workflowType: text('workflow_type').notNull(),
  assemblyNumber: integer('assembly_number').notNull(),
  firstCallDate: text('first_call_date').notNull(),    // dd/mm/yyyy
  triggeredBy: text('triggered_by').notNull(),          // user email — kept for log immutability (readable even if user deleted)
  triggeredById: text('triggered_by_id').references(() => user.id), // FK for referential integrity while user exists
  status: text('status').notNull(),                     // 'success' | 'error'
  errorMessage: text('error_message'),
  convocazioneDriveUrl: text('convocazione_drive_url'),
  verbale1aDriveUrl: text('verbale1a_drive_url'),
  verbale2aDriveUrl: text('verbale2a_drive_url'),
  convocazionePdfUrl: text('convocazione_pdf_url'),
  verbale1aPdfUrl: text('verbale1a_pdf_url'),
  verbale2aPdfUrl: text('verbale2a_pdf_url'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_document_generation_log_org_id').on(table.orgId),
}));

export const organizationAddress = sqliteTable('organization_address', {
  id: text('id').primaryKey(),
  address: text('address').notNull(),
  effectiveFrom: text('effective_from').notNull(), // ISO8601 date
  notes: text('notes'),
  orgId: text('org_id'), // nullable, no FK constraint per migration 0047
  createdAt: text('created_at').notNull(),
});

export const alertSuppression = sqliteTable('alert_suppression', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  alertKey: text('alert_key').notNull(),
  personId: text('person_id').references(() => person.id),
  reason: text('reason').notNull(),
  note: text('note'),
  untilDate: text('until_date'),
  suppressedBy: text('suppressed_by'),       // user email — kept for log immutability
  suppressedById: text('suppressed_by_id').references(() => user.id), // FK for referential integrity while user exists
  suppressedAt: text('suppressed_at').notNull(),
  releasedAt: text('released_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  orgIdIdx: index('idx_alert_suppression_org_id').on(table.orgId),
}));

// ============================================================================
// ENUM LOOKUP TABLES (Phase 1 Schema Normalization)
// ============================================================================

export const assemblyType = sqliteTable('assembly_type', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  requiresSubtype: integer('requires_subtype').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const assemblySubtype = sqliteTable('assembly_subtype', {
  id: text('id').primaryKey(),
  assemblyTypeId: text('assembly_type_id').notNull().references(() => assemblyType.id),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

export const assemblyStatus = sqliteTable('assembly_status', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

export const assemblyLocation = sqliteTable('assembly_location', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  addressId: text('address_id').references(() => organizationAddress.id),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull(),
});

export const modeOption = sqliteTable('mode_option', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const volunteerStatus = sqliteTable('volunteer_status', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const attendanceMode = sqliteTable('attendance_mode', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const userRole = sqliteTable('user_role', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  permissions: text('permissions').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
});

export const consentStatus = sqliteTable('consent_status', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const documentType = sqliteTable('document_type', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

export const collectionMethod = sqliteTable('collection_method', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const complianceRoleType = sqliteTable('compliance_role_type', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const auditEvent = sqliteTable('audit_event', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  actorId: text('actor_id'),
  orgId: text('org_id'),
  payload: text('payload'),
  ip: text('ip'),
  createdAt: text('created_at').notNull(),
});

export const setupAttempt = sqliteTable('setup_attempt', {
  id: text('id').primaryKey(),
  ip: text('ip').notNull(),
  attemptedAt: text('attempted_at').notNull(),
});
