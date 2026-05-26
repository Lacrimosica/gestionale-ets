-- Add org_id to all 16 core tables
ALTER TABLE person ADD COLUMN org_id TEXT;
ALTER TABLE board_generation ADD COLUMN org_id TEXT;
ALTER TABLE assembly ADD COLUMN org_id TEXT;
ALTER TABLE volunteer_period ADD COLUMN org_id TEXT;
ALTER TABLE board_member ADD COLUMN org_id TEXT;
ALTER TABLE convocation ADD COLUMN org_id TEXT;
ALTER TABLE document_generation_log ADD COLUMN org_id TEXT;
ALTER TABLE attendance ADD COLUMN org_id TEXT;
ALTER TABLE compliance_role ADD COLUMN org_id TEXT;
ALTER TABLE compliance_document ADD COLUMN org_id TEXT;
ALTER TABLE alert_suppression ADD COLUMN org_id TEXT;
ALTER TABLE member_period ADD COLUMN org_id TEXT;
ALTER TABLE agenda_item ADD COLUMN org_id TEXT;
ALTER TABLE compliance_document_flag ADD COLUMN org_id TEXT;
ALTER TABLE consent_record ADD COLUMN org_id TEXT;
ALTER TABLE agenda_item_person ADD COLUMN org_id TEXT;

-- Backfill existing rows with the default org
UPDATE person SET org_id = 'default' WHERE org_id IS NULL;
UPDATE board_generation SET org_id = 'default' WHERE org_id IS NULL;
UPDATE assembly SET org_id = 'default' WHERE org_id IS NULL;
UPDATE volunteer_period SET org_id = 'default' WHERE org_id IS NULL;
UPDATE board_member SET org_id = 'default' WHERE org_id IS NULL;
UPDATE convocation SET org_id = 'default' WHERE org_id IS NULL;
UPDATE document_generation_log SET org_id = 'default' WHERE org_id IS NULL;
UPDATE attendance SET org_id = 'default' WHERE org_id IS NULL;
UPDATE compliance_role SET org_id = 'default' WHERE org_id IS NULL;
UPDATE compliance_document SET org_id = 'default' WHERE org_id IS NULL;
UPDATE alert_suppression SET org_id = 'default' WHERE org_id IS NULL;
UPDATE member_period SET org_id = 'default' WHERE org_id IS NULL;
UPDATE agenda_item SET org_id = 'default' WHERE org_id IS NULL;
UPDATE compliance_document_flag SET org_id = 'default' WHERE org_id IS NULL;
UPDATE consent_record SET org_id = 'default' WHERE org_id IS NULL;
UPDATE agenda_item_person SET org_id = 'default' WHERE org_id IS NULL;
