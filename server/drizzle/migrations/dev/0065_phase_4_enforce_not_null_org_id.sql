-- Phase 4: Enforce NOT NULL on org_id columns and update uniqueness constraints
-- SQLite requires table recreation to add NOT NULL to existing columns
-- Pattern: CREATE TABLE X_new, INSERT INTO X_new SELECT * FROM X, DROP X, ALTER TABLE X_new RENAME TO X

-- ============================================================================
-- PERSON: Recreate with NOT NULL org_id and composite unique (org_id, tax_id)
-- ============================================================================
CREATE TABLE `person_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
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
	`is_student` integer DEFAULT 0 NOT NULL,
	`is_employee` integer DEFAULT 0 NOT NULL,
	`member_number` text,
	`notes` text,
	`cf_validation` text,
	`user_id` text,
	`in_libro_volontari_cartaceo` integer DEFAULT 0 NOT NULL,
	`libro_volontari_start_date` text,
	`libro_volontari_end_date` text,
	`appears_in_runts_verbale` integer DEFAULT 0 NOT NULL,
	`is_in_volunteer_registry_physical` integer DEFAULT 0 NOT NULL,
	`volunteer_registry_start_date` text,
	`volunteer_registry_end_date` text,
	`appears_in_runts_proceedings` integer DEFAULT 0 NOT NULL,
	`can_be_removed` integer DEFAULT 1 NOT NULL,
	`needs_regularization` integer DEFAULT 0 NOT NULL,
	`is_presumed_non_existent` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	UNIQUE(`org_id`, `tax_id`)
);

INSERT INTO `person_new` SELECT * FROM `person`;
DROP TABLE `person`;
ALTER TABLE `person_new` RENAME TO `person`;

--> statement-breakpoint

-- ============================================================================
-- VOLUNTEER_PERIOD: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `volunteer_period_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`person_id` text NOT NULL,
	`status` text NOT NULL,
	`status_id` text,
	`enrollment_date` text NOT NULL,
	`exit_date` text,
	`exit_reason` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`status_id`) REFERENCES `volunteer_status`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `volunteer_period_new` SELECT * FROM `volunteer_period`;
DROP TABLE `volunteer_period`;
ALTER TABLE `volunteer_period_new` RENAME TO `volunteer_period`;

--> statement-breakpoint

-- ============================================================================
-- MEMBER_PERIOD: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `member_period_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`person_id` text NOT NULL,
	`volunteer_period_id` text NOT NULL,
	`admission_date` text NOT NULL,
	`resignation_date` text,
	`exit_reason` text,
	`article_reference` text,
	`admission_assembly_id` text,
	`exit_assembly_id` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`volunteer_period_id`) REFERENCES `volunteer_period`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`admission_assembly_id`) REFERENCES `assembly`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exit_assembly_id`) REFERENCES `assembly`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `member_period_new` SELECT * FROM `member_period`;
DROP TABLE `member_period`;
ALTER TABLE `member_period_new` RENAME TO `member_period`;

--> statement-breakpoint

-- ============================================================================
-- BOARD_GENERATION: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `board_generation_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`created_at` text NOT NULL
);

INSERT INTO `board_generation_new` SELECT * FROM `board_generation`;
DROP TABLE `board_generation`;
ALTER TABLE `board_generation_new` RENAME TO `board_generation`;

--> statement-breakpoint

-- ============================================================================
-- BOARD_MEMBER: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `board_member_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`generation_id` text NOT NULL,
	`person_id` text NOT NULL,
	`role` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`generation_id`) REFERENCES `board_generation`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `board_member_new` SELECT * FROM `board_member`;
DROP TABLE `board_member`;
ALTER TABLE `board_member_new` RENAME TO `board_member`;

--> statement-breakpoint

-- ============================================================================
-- ASSEMBLY: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `assembly_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`type` text NOT NULL,
	`type_id` text,
	`subtype` text,
	`subtype_id` text,
	`deposited_on_runts` integer DEFAULT 0 NOT NULL,
	`runts_deposit_date` text,
	`total_number` integer NOT NULL,
	`reference_number` integer NOT NULL,
	`reference_year` integer,
	`first_call_date` text,
	`first_call_time` text,
	`second_call_date` text,
	`second_call_time` text,
	`location` text NOT NULL,
	`location_id` text,
	`mode` text NOT NULL,
	`mode_id` text,
	`board_generation_id` text,
	`assembly_status` text,
	`status_id` text,
	`president_id` text,
	`secretary_id` text,
	`notes` text,
	`meet_link` text,
	`google_docs_link` text,
	`pdf_link` text,
	`modality_formula_prima` text,
	`first_call_modality_id` text,
	`modality_formula_apertura` text,
	`opening_modality_id` text,
	`end_time` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`type_id`) REFERENCES `assembly_type`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subtype_id`) REFERENCES `assembly_subtype`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `assembly_location`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mode_id`) REFERENCES `mode_option`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`board_generation_id`) REFERENCES `board_generation`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`status_id`) REFERENCES `assembly_status`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`president_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`secretary_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`first_call_modality_id`) REFERENCES `convocation_modality_option`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opening_modality_id`) REFERENCES `convocation_modality_option`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `assembly_new` SELECT * FROM `assembly`;
DROP TABLE `assembly`;
ALTER TABLE `assembly_new` RENAME TO `assembly`;

--> statement-breakpoint

-- ============================================================================
-- CONVOCATION: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `convocation_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`assembly_id` text NOT NULL,
	`second_assembly_id` text,
	`date` text NOT NULL,
	`send_deadline` text,
	`content` text,
	`document_link` text,
	`proxy_form_link` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`assembly_id`) REFERENCES `assembly`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`second_assembly_id`) REFERENCES `assembly`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `convocation_new` SELECT * FROM `convocation`;
DROP TABLE `convocation`;
ALTER TABLE `convocation_new` RENAME TO `convocation`;

--> statement-breakpoint

-- ============================================================================
-- AGENDA_ITEM: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `agenda_item_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`convocation_id` text,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`resolution` text,
	`workflow_type` text,
	`workflow_data` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`convocation_id`) REFERENCES `convocation`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `agenda_item_new` SELECT * FROM `agenda_item`;
DROP TABLE `agenda_item`;
ALTER TABLE `agenda_item_new` RENAME TO `agenda_item`;

--> statement-breakpoint

-- ============================================================================
-- AGENDA_ITEM_PERSON: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `agenda_item_person_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`agenda_item_id` text NOT NULL,
	`person_id` text NOT NULL,
	`role` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`agenda_item_id`) REFERENCES `agenda_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `agenda_item_person_new` SELECT * FROM `agenda_item_person`;
DROP TABLE `agenda_item_person`;
ALTER TABLE `agenda_item_person_new` RENAME TO `agenda_item_person`;

--> statement-breakpoint

-- ============================================================================
-- ATTENDANCE: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `attendance_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`assembly_id` text NOT NULL,
	`person_id` text NOT NULL,
	`mode` text NOT NULL,
	`mode_id` text,
	`delegator_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assembly_id`) REFERENCES `assembly`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mode_id`) REFERENCES `attendance_mode`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delegator_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `attendance_new` SELECT * FROM `attendance`;
DROP TABLE `attendance`;
ALTER TABLE `attendance_new` RENAME TO `attendance`;

--> statement-breakpoint

-- ============================================================================
-- COMPLIANCE_ROLE: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `compliance_role_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`person_id` text NOT NULL,
	`role_type` text NOT NULL,
	`role_type_id` text,
	`start_date` text,
	`end_date` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_type_id`) REFERENCES `compliance_role_type`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `compliance_role_new` SELECT * FROM `compliance_role`;
DROP TABLE `compliance_role`;
ALTER TABLE `compliance_role_new` RENAME TO `compliance_role`;

--> statement-breakpoint

-- ============================================================================
-- COMPLIANCE_DOCUMENT: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `compliance_document_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`person_id` text NOT NULL,
	`document_type` text NOT NULL,
	`document_type_id` text,
	`version` text,
	`drive_url` text,
	`signed_at` text,
	`effective_from` text,
	`effective_to` text,
	`is_current` integer DEFAULT 1 NOT NULL,
	`is_signed` integer DEFAULT 0 NOT NULL,
	`is_dated` integer DEFAULT 0 NOT NULL,
	`is_complete` integer DEFAULT 1 NOT NULL,
	`is_digital` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_type_id`) REFERENCES `document_type`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `compliance_document_new` SELECT * FROM `compliance_document`;
DROP TABLE `compliance_document`;
ALTER TABLE `compliance_document_new` RENAME TO `compliance_document`;

--> statement-breakpoint

-- ============================================================================
-- COMPLIANCE_DOCUMENT_FLAG: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `compliance_document_flag_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
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

INSERT INTO `compliance_document_flag_new` SELECT * FROM `compliance_document_flag`;
DROP TABLE `compliance_document_flag`;
ALTER TABLE `compliance_document_flag_new` RENAME TO `compliance_document_flag`;

--> statement-breakpoint

-- ============================================================================
-- CONSENT_RECORD: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `consent_record_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`person_id` text NOT NULL,
	`document_id` text,
	`consent_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`status_id` text,
	`granted_at` text,
	`withdrawn_at` text,
	`policy_version` text,
	`collection_method` text,
	`collection_method_id` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`document_id`) REFERENCES `compliance_document`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`status_id`) REFERENCES `consent_status`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`collection_method_id`) REFERENCES `collection_method`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `consent_record_new` SELECT * FROM `consent_record`;
DROP TABLE `consent_record`;
ALTER TABLE `consent_record_new` RENAME TO `consent_record`;

--> statement-breakpoint

-- ============================================================================
-- DOCUMENT_GENERATION_LOG: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `document_generation_log_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`assembly_id` text,
	`workflow_type` text NOT NULL,
	`assembly_number` integer NOT NULL,
	`first_call_date` text NOT NULL,
	`triggered_by` text NOT NULL,
	`triggered_by_id` text,
	`status` text NOT NULL,
	`error_message` text,
	`convocazione_drive_url` text,
	`verbale1a_drive_url` text,
	`verbale2a_drive_url` text,
	`convocazione_pdf_url` text,
	`verbale1a_pdf_url` text,
	`verbale2a_pdf_url` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assembly_id`) REFERENCES `assembly`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`triggered_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `document_generation_log_new` SELECT * FROM `document_generation_log`;
DROP TABLE `document_generation_log`;
ALTER TABLE `document_generation_log_new` RENAME TO `document_generation_log`;

--> statement-breakpoint

-- ============================================================================
-- ALERT_SUPPRESSION: Recreate with NOT NULL org_id
-- ============================================================================
CREATE TABLE `alert_suppression_new` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`alert_key` text NOT NULL,
	`person_id` text,
	`reason` text NOT NULL,
	`note` text,
	`until_date` text,
	`suppressed_by` text,
	`suppressed_by_id` text,
	`suppressed_at` text NOT NULL,
	`released_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`suppressed_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `alert_suppression_new` SELECT * FROM `alert_suppression`;
DROP TABLE `alert_suppression`;
ALTER TABLE `alert_suppression_new` RENAME TO `alert_suppression`;
