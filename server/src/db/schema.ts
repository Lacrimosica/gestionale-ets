import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const person = sqliteTable('person', {
  id: text('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  taxId: text('tax_id').unique(),
  email: text('email'),
  phone: text('phone'),
  birthDate: text('birth_date'), // ISO8601
  birthPlace: text('birth_place'),
  birthCountry: text('birth_country'),
  gender: text('gender'),
  profession: text('profession'),
  memberNumber: text('member_number'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(), // ISO8601
  updatedAt: text('updated_at').notNull(),
});

export const volunteerPeriod = sqliteTable('volunteer_period', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull().references(() => person.id),
  status: text('status').notNull(), // 'active' | 'inactive' | 'suspended' | 'resigned'
  enrollmentDate: text('enrollment_date').notNull(),
  exitDate: text('exit_date'),
  exitReason: text('exit_reason'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const memberPeriod = sqliteTable('member_period', {
  id: text('id').primaryKey(),
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
});

export const boardGeneration = sqliteTable('board_generation', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // e.g. "2019-2020 (1°)"
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  createdAt: text('created_at').notNull(),
});

export const memberGeneration = sqliteTable('member_generation', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // e.g. "4° gen"
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  createdAt: text('created_at').notNull(),
});

export const boardMember = sqliteTable('board_member', {
  id: text('id').primaryKey(),
  generationId: text('generation_id').notNull().references(() => boardGeneration.id),
  personId: text('person_id').notNull().references(() => person.id),
  role: text('role').notNull(), // President, Vice President, Treasurer, Councilor
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const assembly = sqliteTable('assembly', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'ordinary' | 'extraordinary' | 'board_council' | 'constitution'
  totalNumber: integer('total_number').notNull(),
  referenceNumber: integer('reference_number').notNull(), // Annual or mandate reset
  referenceYear: integer('reference_year'), // For Assemblies
  convocationDate: text('convocation_date'), // Optional for CD
  firstCallDate: text('first_call_date'), // Optional for CD
  firstCallTime: text('first_call_time'),
  secondCallDate: text('second_call_date'),
  secondCallTime: text('second_call_time'),
  location: text('location').notNull(),
  mode: text('mode').notNull(), // 'in_person' | 'remote' | 'hybrid'
  boardGenerationId: text('board_generation_id').references(() => boardGeneration.id),
  assemblyStatus: text('assembly_status'), // 'held' | 'deserted' | 'not_planned'
  president: text('president').notNull(),
  secretary: text('secretary').notNull(),
  notes: text('notes'),
  googleDocsLink: text('google_docs_link'),
  pdfLink: text('pdf_link'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const convocation = sqliteTable('convocation', {
  id: text('id').primaryKey(),
  assemblyId: text('assembly_id').notNull().references(() => assembly.id),
  secondAssemblyId: text('second_assembly_id').references(() => assembly.id),
  sentAt: text('sent_at').notNull(), // ISO8601 - when the convocation was sent
  sendDeadline: text('send_deadline'), // optional - must be sent by this date
  content: text('content'), // body text
  documentLink: text('document_link'),
  proxyFormLink: text('proxy_form_link'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const agendaItem = sqliteTable('agenda_item', {
  id: text('id').primaryKey(),
  assemblyId: text('assembly_id').notNull().references(() => assembly.id),
  number: integer('number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  resolution: text('resolution'),
  createdAt: text('created_at').notNull(),
});

export const attendance = sqliteTable('attendance', {
  id: text('id').primaryKey(),
  assemblyId: text('assembly_id').notNull().references(() => assembly.id),
  personId: text('person_id').notNull().references(() => person.id),
  mode: text('mode').notNull(), // 'present' | 'remote' | 'proxy'
  delegatorId: text('delegator_id').references(() => person.id),
  createdAt: text('created_at').notNull(),
});

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().default('admin'), // 'admin' | 'viewer'
  permissions: text('permissions').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
});

export const appSetting = sqliteTable('app_setting', {
  id: text('id').primaryKey(),
  organizationName: text('organization_name').notNull(),
  shortName: text('short_name').notNull(),
  authDomain: text('auth_domain'),
  tagline: text('tagline'),
  supportEmail: text('support_email'),
  logoDataUrl: text('logo_data_url'),
  complianceRules: text('compliance_rules'), // JSON blob – nullable, falls back to static JSON file
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const complianceRole = sqliteTable('compliance_role', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull().references(() => person.id),
  roleType: text('role_type').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const complianceDocument = sqliteTable('compliance_document', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull().references(() => person.id),
  documentType: text('document_type').notNull(),
  version: text('version'),
  driveUrl: text('drive_url'),
  signedAt: text('signed_at'),
  effectiveFrom: text('effective_from'),
  effectiveTo: text('effective_to'),
  isCurrent: integer('is_current').notNull().default(1),
  isSigned: integer('is_signed').notNull().default(0),
  isDated: integer('is_dated').notNull().default(0),
  isComplete: integer('is_complete').notNull().default(1),
  dataProcessingConsent: integer('data_processing_consent'),
  thirdPartyCommunicationConsent: integer('third_party_communication_consent'),
  imageUseConsent: integer('image_use_consent'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const complianceDocumentFlag = sqliteTable('compliance_document_flag', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull().references(() => complianceDocument.id),
  code: text('code').notNull(),
  label: text('label').notNull(),
  severity: text('severity').notNull().default('warning'),
  isProblematic: integer('is_problematic').notNull().default(1),
  note: text('note'),
  resolvedAt: text('resolved_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const alertSuppression = sqliteTable('alert_suppression', {
  id: text('id').primaryKey(),
  alertKey: text('alert_key').notNull(),
  personId: text('person_id').references(() => person.id),
  reason: text('reason').notNull(),
  note: text('note'),
  untilDate: text('until_date'),
  suppressedBy: text('suppressed_by'),
  suppressedAt: text('suppressed_at').notNull(),
  releasedAt: text('released_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
