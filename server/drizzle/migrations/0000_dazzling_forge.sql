CREATE TABLE `agenda_item` (
	`id` text PRIMARY KEY NOT NULL,
	`assembly_id` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`resolution` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assembly_id`) REFERENCES `assembly`(`id`) ON UPDATE no action ON DELETE no action
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
	`suppressed_at` text NOT NULL,
	`released_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `app_setting` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_name` text NOT NULL,
	`short_name` text NOT NULL,
	`auth_domain` text,
	`tagline` text,
	`support_email` text,
	`logo_data_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assembly` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`total_number` integer NOT NULL,
	`reference_number` integer NOT NULL,
	`reference_year` integer,
	`convocation_date` text,
	`first_call_date` text,
	`first_call_time` text,
	`second_call_date` text,
	`second_call_time` text,
	`location` text NOT NULL,
	`mode` text NOT NULL,
	`board_generation_id` text,
	`assembly_status` text,
	`president` text NOT NULL,
	`secretary` text NOT NULL,
	`notes` text,
	`google_docs_link` text,
	`pdf_link` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`board_generation_id`) REFERENCES `board_generation`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`assembly_id` text NOT NULL,
	`person_id` text NOT NULL,
	`mode` text NOT NULL,
	`delegator_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assembly_id`) REFERENCES `assembly`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delegator_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
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
	`data_processing_consent` integer,
	`third_party_communication_consent` integer,
	`image_use_consent` integer,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
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
	`start_date` text,
	`end_date` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `convocation` (
	`id` text PRIMARY KEY NOT NULL,
	`assembly_id` text NOT NULL,
	`second_assembly_id` text,
	`sent_at` text NOT NULL,
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
CREATE TABLE `member_generation` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`created_at` text NOT NULL
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
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`permissions` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `volunteer_period` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`status` text NOT NULL,
	`enrollment_date` text NOT NULL,
	`exit_date` text,
	`exit_reason` text,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `person`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `person_tax_id_unique` ON `person` (`tax_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);