-- Phase 1: Seed Enum Lookup Tables with Initial Values
-- This migration populates all lookup tables created in 0026_create_lookup_tables.sql

PRAGMA foreign_keys = ON;

-- ============================================================================
-- ASSEMBLY TYPE VALUES
-- ============================================================================

INSERT OR IGNORE INTO assembly_type (id, code, name, description, requires_subtype, created_at) VALUES
  ('atype-01', 'ordinary', 'Assemblea Ordinaria', 'Regular assembly meeting', 0, datetime('now')),
  ('atype-02', 'extraordinary', 'Assemblea Straordinaria', 'Special assembly meeting', 1, datetime('now')),
  ('atype-03', 'board_council', 'Riunione Consiglio Direttivo', 'Board council meeting', 1, datetime('now')),
  ('atype-04', 'constitution', 'Assemblea Costitutiva', 'Constitutional assembly', 0, datetime('now'));

-- ============================================================================
-- ASSEMBLY SUBTYPE VALUES
-- ============================================================================

-- Extraordinary subtypes
INSERT OR IGNORE INTO assembly_subtype (id, assembly_type_id, code, name, description, created_at) VALUES
  ('asub-01', 'atype-02', 'generic', 'Straordinaria Generica', 'Generic extraordinary assembly', datetime('now')),
  ('asub-02', 'atype-02', 'statute_modification', 'Modifica Statuto', 'Statute modification assembly', datetime('now')),
  ('asub-03', 'atype-02', 'dissolution', 'Scioglimento', 'Dissolution assembly', datetime('now')),
  ('asub-04', 'atype-02', 'merger_split', 'Fusione/Scissione', 'Merger or split assembly', datetime('now'));

-- Board council subtypes
INSERT OR IGNORE INTO assembly_subtype (id, assembly_type_id, code, name, description, created_at) VALUES
  ('asub-05', 'atype-03', 'ordinary', 'Ordinaria', 'Ordinary board council meeting', datetime('now')),
  ('asub-06', 'atype-03', 'extraordinary', 'Straordinaria', 'Extraordinary board council meeting', datetime('now'));

-- ============================================================================
-- ASSEMBLY STATUS VALUES
-- ============================================================================

INSERT OR IGNORE INTO assembly_status (id, code, name, description, created_at) VALUES
  ('astatus-01', 'held', 'Svolta', 'Assembly was held', datetime('now')),
  ('astatus-02', 'deserted', 'Deserta', 'Assembly was deserted (no quorum)', datetime('now')),
  ('astatus-03', 'not_planned', 'Non Pianificata', 'Assembly not yet planned', datetime('now'));

-- ============================================================================
-- MODE OPTION VALUES (unified across assembly.mode and attendance modes)
-- ============================================================================

INSERT OR IGNORE INTO mode_option (id, code, name, created_at) VALUES
  ('mode-01', 'in_person', 'In Person', datetime('now')),
  ('mode-02', 'remote', 'Remote', datetime('now')),
  ('mode-03', 'hybrid', 'Hybrid', datetime('now')),
  ('mode-04', 'any', 'Any Mode', datetime('now'));

-- ============================================================================
-- VOLUNTEER STATUS VALUES
-- ============================================================================

INSERT OR IGNORE INTO volunteer_status (id, code, name, created_at) VALUES
  ('vstatus-01', 'active', 'Active', datetime('now')),
  ('vstatus-02', 'inactive', 'Inactive', datetime('now')),
  ('vstatus-03', 'suspended', 'Suspended', datetime('now')),
  ('vstatus-04', 'resigned', 'Resigned', datetime('now'));

-- ============================================================================
-- ATTENDANCE MODE VALUES
-- ============================================================================

INSERT OR IGNORE INTO attendance_mode (id, code, name, created_at) VALUES
  ('amode-01', 'present', 'Present', datetime('now')),
  ('amode-02', 'remote', 'Remote', datetime('now')),
  ('amode-03', 'proxy', 'Proxy', datetime('now'));

-- ============================================================================
-- USER ROLE VALUES
-- ============================================================================

INSERT OR IGNORE INTO user_role (id, code, name, permissions, created_at) VALUES
  ('urole-01', 'admin', 'Administrator', '["*"]', datetime('now')),
  ('urole-02', 'viewer', 'Viewer', '["read:all"]', datetime('now'));

-- ============================================================================
-- CONSENT STATUS VALUES
-- ============================================================================

INSERT OR IGNORE INTO consent_status (id, code, name, created_at) VALUES
  ('cstatus-01', 'granted', 'Granted', datetime('now')),
  ('cstatus-02', 'withdrawn', 'Withdrawn', datetime('now')),
  ('cstatus-03', 'pending', 'Pending', datetime('now'));

-- ============================================================================
-- DOCUMENT TYPE VALUES
-- ============================================================================

INSERT OR IGNORE INTO document_type (id, code, name, description, created_at) VALUES
  ('dtype-01', 'privacy_policy', 'Privacy Policy', 'Privacy policy document', datetime('now')),
  ('dtype-02', 'consent_form', 'Consent Form', 'General consent form', datetime('now')),
  ('dtype-03', 'volunteer_agreement', 'Volunteer Agreement', 'Volunteer agreement', datetime('now')),
  ('dtype-04', 'board_election', 'Board Election Document', 'Board election related document', datetime('now')),
  ('dtype-05', 'minutes', 'Assembly Minutes', 'Official assembly minutes', datetime('now'));

-- ============================================================================
-- COLLECTION METHOD VALUES
-- ============================================================================

INSERT OR IGNORE INTO collection_method (id, code, name, created_at) VALUES
  ('cmethod-01', 'written_form', 'Written Form', datetime('now')),
  ('cmethod-02', 'digital_checkbox', 'Digital Checkbox', datetime('now')),
  ('cmethod-03', 'verbal', 'Verbal', datetime('now')),
  ('cmethod-04', 'email', 'Email', datetime('now'));

-- ============================================================================
-- COMPLIANCE ROLE TYPE VALUES
-- ============================================================================

INSERT OR IGNORE INTO compliance_role_type (id, code, name, created_at) VALUES
  ('crtype-01', 'data_controller', 'Data Controller', datetime('now')),
  ('crtype-02', 'data_processor', 'Data Processor', datetime('now')),
  ('crtype-03', 'dpo', 'Data Protection Officer', datetime('now')),
  ('crtype-04', 'compliance_officer', 'Compliance Officer', datetime('now'));
