-- Database Schema Snapshot
-- Generated: 2026-04-23T19:15:04.526Z
--
-- This file represents the current state of all tables and indexes.
-- Use for fresh local database setup via: wrangler d1 execute ... --file schema.sql
--
-- DO NOT edit manually. Regenerate with: npm run db:snapshot

CREATE TABLE _cf_METADATA (
        key INTEGER PRIMARY KEY,
        value BLOB
      );
CREATE TABLE "agenda_item" (
  id TEXT PRIMARY KEY,
  convocation_id TEXT REFERENCES convocation(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  resolution TEXT,
  workflow_type TEXT,
  workflow_data TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE agenda_item_person (
  id TEXT PRIMARY KEY,
  agenda_item_id TEXT NOT NULL REFERENCES agenda_item(id),
  person_id TEXT NOT NULL REFERENCES person(id),
  role TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE `alert_suppression` (
	`id` text PRIMARY KEY NOT NULL,
	`alert_key` text NOT NULL,
	`person_id` text,
	`reason` text NOT NULL,
	`note` text,
	`until_date` text,
	`suppressed_by` text,
	`suppressed_at` text NOT NULL,
	`released_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE "organization_setting" (
	`id` text PRIMARY KEY NOT NULL,
	`city` text,
	`statute_article_convocation` text,
	`statute_article_proxies` text,
	`statute_article_members` text,
	`statute_article_board_vote` text,
	`statute_article_board_election` text,
	`max_proxies` integer,
	`output_folder_id` text,
	`template_convocation_id` text,
	`template_minutes_1a_id` text,
	`template_minutes_2a_id` text,
	`template_convocation_extraordinary_statute_id` text,
	`template_convocation_extraordinary_dissolution_id` text,
	`template_convocation_board_id` text,
	`template_minutes_board_id` text,
	`miscellaneous_default_text` text,
	`varie_default_text` text,
	`org_id` text,
	`created_at` text NOT NULL,
	`updated_at` text
);
CREATE TABLE `assembly` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`total_number` integer NOT NULL,
	`reference_number` integer NOT NULL,
	`reference_year` integer,
	`first_call_date` text,
	`first_call_time` text,
	`second_call_date` text,
	`second_call_time` text,
	`location` text NOT NULL,
	`mode` text NOT NULL,
	`board_generation_id` text,
	`assembly_status` text,
	`notes` text,
	`google_docs_link` text,
	`pdf_link` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL, meet_link TEXT, modality_formula_prima TEXT, modality_formula_apertura TEXT, `end_time` text, `subtype` text, `deposited_on_runts` integer NOT NULL DEFAULT 0, `runts_deposit_date` text, `president_id` TEXT REFERENCES person(id), `secretary_id` TEXT REFERENCES person(id), type_id TEXT REFERENCES assembly_type(id), subtype_id TEXT REFERENCES assembly_subtype(id), status_id TEXT REFERENCES assembly_status(id), location_id TEXT REFERENCES assembly_location(id), first_call_modality_id TEXT REFERENCES convocation_modality_option(id), opening_modality_id TEXT REFERENCES convocation_modality_option(id), mode_id TEXT REFERENCES mode_option(id),
	FOREIGN KEY (`board_generation_id`) REFERENCES `board_generation`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE assembly_location (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address_id TEXT REFERENCES organization_address(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE assembly_status (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE assembly_subtype (
  id TEXT PRIMARY KEY,
  assembly_type_id TEXT NOT NULL REFERENCES assembly_type(id),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE assembly_type (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  requires_subtype INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`assembly_id` text NOT NULL,
	`person_id` text NOT NULL,
	`mode` text NOT NULL,
	`delegator_id` text,
	`created_at` text NOT NULL, mode_id TEXT,
	FOREIGN KEY (`assembly_id`) REFERENCES `assembly`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delegator_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE attendance_mode (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE audit_event (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,       
  actor_id TEXT,                  
  org_id TEXT,                    
  payload TEXT,                   
  ip TEXT,                        
  created_at TEXT NOT NULL        
);
CREATE TABLE `board_generation` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`created_at` text NOT NULL
);
CREATE TABLE `board_member` (
	`id` text PRIMARY KEY NOT NULL,
	`generation_id` text NOT NULL,
	`person_id` text NOT NULL,
	`role` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`generation_id`) REFERENCES `board_generation`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE collection_method (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE `compliance_document` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`document_type` text NOT NULL,
	`version` text,
	`drive_url` text,
	`signed_at` text,
	`effective_from` text,
	`effective_to` text,
	`is_current` integer DEFAULT 1 NOT NULL,
	`is_signed` integer DEFAULT 0 NOT NULL,
	`is_dated` integer DEFAULT 0 NOT NULL,
	`is_complete` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL, `is_digital` integer NOT NULL DEFAULT 1, document_type_id TEXT REFERENCES document_type(id),
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `compliance_document_flag` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`severity` text DEFAULT 'warning' NOT NULL,
	`is_problematic` integer DEFAULT 1 NOT NULL,
	`note` text,
	`resolved_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `compliance_document`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `compliance_role` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`role_type` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL, role_type_id TEXT REFERENCES compliance_role_type(id),
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE compliance_role_type (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE `consent_record` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL REFERENCES `person`(`id`),
	`document_id` text REFERENCES `compliance_document`(`id`),
	`consent_type` text NOT NULL,
	`status` text NOT NULL DEFAULT 'pending',
	`granted_at` text,
	`withdrawn_at` text,
	`policy_version` text,
	`collection_method` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
, status_id TEXT REFERENCES consent_status(id), collection_method_id TEXT REFERENCES collection_method(id));
CREATE TABLE consent_status (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE `convocation` (
	`id` text PRIMARY KEY NOT NULL,
	`assembly_id` text NOT NULL,
	`second_assembly_id` text,
	`send_deadline` text,
	`content` text,
	`document_link` text,
	`proxy_form_link` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL, `date` TEXT,
	FOREIGN KEY (`assembly_id`) REFERENCES `assembly`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`second_assembly_id`) REFERENCES `assembly`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE "convocation_modality_option" (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`mode` text,
	`label` text NOT NULL,
	`value` text NOT NULL,
	`is_default` integer NOT NULL DEFAULT 0,
	`org_id` text,
	`created_at` text NOT NULL
);
CREATE TABLE `document_generation_log` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_type` text NOT NULL,
	`assembly_number` integer NOT NULL,
	`first_call_date` text NOT NULL,
	`triggered_by` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`convocazione_drive_url` text,
	`verbale1a_drive_url` text,
	`verbale2a_drive_url` text,
	`convocazione_pdf_url` text,
	`verbale1a_pdf_url` text,
	`verbale2a_pdf_url` text,
	`notes` text,
	`created_at` text NOT NULL
);
CREATE TABLE document_type (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_agenda_item_person_unique ON agenda_item_person(agenda_item_id, person_id);
CREATE INDEX idx_assembly_location_active ON assembly_location(is_active);
CREATE INDEX idx_assembly_location_name ON assembly_location(name);
CREATE INDEX idx_assembly_status_code ON assembly_status(code);
CREATE INDEX idx_assembly_subtype_type_id ON assembly_subtype(assembly_type_id);
CREATE INDEX idx_assembly_type_code ON assembly_type(code);
CREATE INDEX idx_attendance_mode_code ON attendance_mode(code);
CREATE INDEX idx_audit_event_created ON audit_event(created_at DESC);
CREATE INDEX idx_audit_event_org ON audit_event(org_id);
CREATE INDEX idx_audit_event_type ON audit_event(event_type);
CREATE INDEX idx_collection_method_code ON collection_method(code);
CREATE INDEX idx_compliance_role_type_code ON compliance_role_type(code);
CREATE INDEX idx_consent_status_code ON consent_status(code);
CREATE INDEX idx_document_type_code ON document_type(code);
CREATE INDEX idx_mode_option_code ON mode_option(code);
CREATE INDEX idx_setup_attempt_ip_time ON setup_attempt(ip, attempted_at);
CREATE INDEX idx_user_role_code ON user_role(code);
CREATE INDEX idx_volunteer_status_code ON volunteer_status(code);
CREATE TABLE invite (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organization(id),
  email TEXT,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  permissions_override TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES user(id),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  used_by_user_id TEXT REFERENCES user(id),
  created_at TEXT NOT NULL
);
CREATE TABLE "member_period" (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES person(id),
  volunteer_period_id TEXT NOT NULL REFERENCES volunteer_period(id),
  admission_date TEXT NOT NULL,
  resignation_date TEXT,
  exit_reason TEXT,
  article_reference TEXT,
  admission_assembly_id TEXT REFERENCES assembly(id),
  exit_assembly_id TEXT REFERENCES assembly(id),
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE mode_option (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE "organization_address" (
	`id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`effective_from` text NOT NULL,
	`notes` text,
	`org_id` text,
	`created_at` text NOT NULL
);
CREATE TABLE organization (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  auth_domain TEXT UNIQUE,
  domain_signup_mode TEXT NOT NULL DEFAULT 'invite_only',
  is_setup_complete INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
, tagline TEXT, support_email TEXT, logo_data_url TEXT);
CREATE TABLE organization_user (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id),
  org_id TEXT NOT NULL REFERENCES organization(id),
  role TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]',
  is_owner INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL,
  invited_by_user_id TEXT,
  UNIQUE(user_id, org_id)
);
CREATE TABLE `person` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`tax_id` text,
	`email` text,
	`phone` text,
	`birth_date` text,
	`birth_place` text,
	`birth_country` text,
	`gender` text,
	`profession` text,
	`member_number` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
, `is_student` integer NOT NULL DEFAULT 0, `is_employee` integer NOT NULL DEFAULT 0, cf_validation TEXT, `in_libro_volontari_cartaceo` integer NOT NULL DEFAULT 0, `libro_volontari_start_date` text, `libro_volontari_end_date` text, `appears_in_runts_verbale` integer NOT NULL DEFAULT 0, `can_be_removed` integer NOT NULL DEFAULT 0, `needs_regularization` integer NOT NULL DEFAULT 0, `is_presumed_non_existent` integer NOT NULL DEFAULT 0, is_in_volunteer_registry_physical INTEGER NOT NULL DEFAULT 0, volunteer_registry_start_date TEXT, volunteer_registry_end_date TEXT, appears_in_runts_proceedings INTEGER NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX `person_tax_id_unique` ON `person` (`tax_id`);
CREATE TABLE setup_attempt (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,               
  attempted_at TEXT NOT NULL      
);
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  google_id TEXT,
  google_refresh_token TEXT,
  google_access_token TEXT,
  google_token_expiry TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE TABLE user_role (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE TABLE user_setting (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  theme      TEXT NOT NULL DEFAULT 'dark-slate',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id)
);
CREATE TABLE `volunteer_period` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`status` text NOT NULL,
	`enrollment_date` text NOT NULL,
	`exit_date` text,
	`exit_reason` text,
	`notes` text,
	`created_at` text NOT NULL, status_id TEXT REFERENCES volunteer_status(id),
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE volunteer_status (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
