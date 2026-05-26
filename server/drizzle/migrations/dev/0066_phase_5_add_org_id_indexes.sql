-- Phase 5: Add indexes on org_id columns for query performance
-- These indexes optimize queries filtered by org_id across all multi-tenant tables

CREATE INDEX idx_person_org_id ON person(org_id);
CREATE INDEX idx_volunteer_period_org_id ON volunteer_period(org_id);
CREATE INDEX idx_member_period_org_id ON member_period(org_id);
CREATE INDEX idx_board_generation_org_id ON board_generation(org_id);
CREATE INDEX idx_board_member_org_id ON board_member(org_id);
CREATE INDEX idx_assembly_org_id ON assembly(org_id);
CREATE INDEX idx_convocation_org_id ON convocation(org_id);
CREATE INDEX idx_attendance_org_id ON attendance(org_id);
CREATE INDEX idx_compliance_role_org_id ON compliance_role(org_id);
CREATE INDEX idx_compliance_document_org_id ON compliance_document(org_id);
CREATE INDEX idx_compliance_document_flag_org_id ON compliance_document_flag(org_id);
CREATE INDEX idx_consent_record_org_id ON consent_record(org_id);
CREATE INDEX idx_alert_suppression_org_id ON alert_suppression(org_id);
CREATE INDEX idx_agenda_item_org_id ON agenda_item(org_id);
CREATE INDEX idx_agenda_item_person_org_id ON agenda_item_person(org_id);
CREATE INDEX idx_document_generation_log_org_id ON document_generation_log(org_id);
