CREATE TABLE `agenda_item` (
	`id` text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `agenda_item_person` (
	`id` text PRIMARY KEY NOT NULL,
	`agenda_item_id` text NOT NULL,
	`person_id` text NOT NULL,
	`role` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`agenda_item_id`) REFERENCES `agenda_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `alert_suppression` (
	`id` text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `assembly` (
	`id` text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `assembly_location` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address_id` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`address_id`) REFERENCES `organization_address`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assembly_status` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assembly_subtype` (
	`id` text PRIMARY KEY NOT NULL,
	`assembly_type_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assembly_type_id`) REFERENCES `assembly_type`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assembly_type` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`requires_subtype` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `attendance_mode` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_event` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`actor_id` text,
	`org_id` text,
	`payload` text,
	`ip` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `board_generation` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `collection_method` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `compliance_document` (
	`id` text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `compliance_role` (
	`id` text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `compliance_role_type` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `consent_record` (
	`id` text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `consent_status` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `convocation` (
	`id` text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `convocation_modality_option` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`mode` text,
	`mode_id` text,
	`label` text NOT NULL,
	`value` text NOT NULL,
	`is_default` integer DEFAULT 0 NOT NULL,
	`org_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mode_id`) REFERENCES `mode_option`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `document_generation_log` (
	`id` text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `document_type` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invite` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`email` text,
	`token` text NOT NULL,
	`role` text NOT NULL,
	`permissions_override` text,
	`created_by_user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`used_by_user_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`used_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `member_period` (
	`id` text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `mode_option` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `organization` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`slug` text NOT NULL,
	`auth_domain` text,
	`domain_signup_mode` text DEFAULT 'invite_only' NOT NULL,
	`tagline` text,
	`support_email` text,
	`logo_data_url` text,
	`is_setup_complete` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `organization_address` (
	`id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`effective_from` text NOT NULL,
	`notes` text,
	`org_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `organization_setting` (
	`id` text PRIMARY KEY NOT NULL,
	`compliance_rules` text,
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
	`varie_default_text` text,
	`miscellaneous_default_text` text,
	`org_id` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `organization_user` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`org_id` text NOT NULL,
	`role` text NOT NULL,
	`permissions` text DEFAULT '[]' NOT NULL,
	`is_owner` integer DEFAULT 0 NOT NULL,
	`joined_at` text NOT NULL,
	`invited_by_user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`org_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `setup_attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`ip` text NOT NULL,
	`attempted_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`google_id` text,
	`google_refresh_token` text,
	`google_access_token` text,
	`google_token_expiry` text,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `user_role` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`permissions` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_setting` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`theme` text DEFAULT 'dark-slate' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `volunteer_period` (
	`id` text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `volunteer_status` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assembly_location_name_unique` ON `assembly_location` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `assembly_status_code_unique` ON `assembly_status` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `assembly_subtype_code_unique` ON `assembly_subtype` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `assembly_type_code_unique` ON `assembly_type` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_mode_code_unique` ON `attendance_mode` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `collection_method_code_unique` ON `collection_method` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `compliance_role_type_code_unique` ON `compliance_role_type` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `consent_status_code_unique` ON `consent_status` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `document_type_code_unique` ON `document_type` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `invite_token_unique` ON `invite` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `mode_option_code_unique` ON `mode_option` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_unique` ON `organization` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_auth_domain_unique` ON `organization` (`auth_domain`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_user_user_id_org_id_unique` ON `organization_user` (`user_id`,`org_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `person_tax_id_unique` ON `person` (`tax_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_role_code_unique` ON `user_role` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `volunteer_status_code_unique` ON `volunteer_status` (`code`);