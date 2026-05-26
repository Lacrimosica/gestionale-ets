-- Phase 1: Data Mapping Validation Tests
-- These tests verify that lookup table seed data is complete and consistent

PRAGMA foreign_keys = ON;

-- ============================================================================
-- TEST 1: Assembly Type Completeness
-- ============================================================================
-- Verify all required assembly types are seeded

SELECT 'TEST 1: Assembly Type Seeding' as test_name;

SELECT
  CASE
    WHEN COUNT(*) = 4 THEN 'PASS'
    ELSE 'FAIL: Expected 4 types, got ' || COUNT(*)
  END as result
FROM assembly_type;

-- Verify all expected codes exist
SELECT
  CASE
    WHEN COUNT(DISTINCT code) = 4 THEN 'PASS'
    ELSE 'FAIL: Missing expected type codes'
  END as result
FROM assembly_type
WHERE code IN ('ordinary', 'extraordinary', 'board_council', 'constitution');

-- ============================================================================
-- TEST 2: Assembly Subtype Completeness
-- ============================================================================
-- Verify assembly subtypes are correctly linked to types

SELECT 'TEST 2: Assembly Subtype Seeding and FK Integrity' as test_name;

SELECT
  CASE
    WHEN COUNT(*) = 6 THEN 'PASS'
    ELSE 'FAIL: Expected 6 subtypes, got ' || COUNT(*)
  END as result
FROM assembly_subtype;

-- Verify FK references are valid
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS'
    ELSE 'FAIL: Found orphaned assembly_subtype records'
  END as result
FROM assembly_subtype asub
WHERE asub.assembly_type_id NOT IN (SELECT id FROM assembly_type);

-- Verify extraordinary has 4 subtypes
SELECT
  CASE
    WHEN COUNT(*) = 4 THEN 'PASS'
    ELSE 'FAIL: Extraordinary should have 4 subtypes'
  END as result
FROM assembly_subtype
WHERE assembly_type_id = (SELECT id FROM assembly_type WHERE code = 'extraordinary');

-- ============================================================================
-- TEST 3: Assembly Status Completeness
-- ============================================================================

SELECT 'TEST 3: Assembly Status Seeding' as test_name;

SELECT
  CASE
    WHEN COUNT(*) = 3 THEN 'PASS'
    ELSE 'FAIL: Expected 3 statuses, got ' || COUNT(*)
  END as result
FROM assembly_status;

-- ============================================================================
-- TEST 4: Mode Options Completeness
-- ============================================================================

SELECT 'TEST 4: Mode Options Seeding' as test_name;

SELECT
  CASE
    WHEN COUNT(*) = 4 THEN 'PASS'
    ELSE 'FAIL: Expected 4 modes, got ' || COUNT(*)
  END as result
FROM mode_option;

-- Verify all required modes exist
SELECT
  CASE
    WHEN COUNT(DISTINCT code) = 4 THEN 'PASS'
    ELSE 'FAIL: Missing expected mode codes'
  END as result
FROM mode_option
WHERE code IN ('in_person', 'remote', 'hybrid', 'any');

-- ============================================================================
-- TEST 5: Volunteer Status Completeness
-- ============================================================================

SELECT 'TEST 5: Volunteer Status Seeding' as test_name;

SELECT
  CASE
    WHEN COUNT(*) = 4 THEN 'PASS'
    ELSE 'FAIL: Expected 4 volunteer statuses, got ' || COUNT(*)
  END as result
FROM volunteer_status;

-- ============================================================================
-- TEST 6: Attendance Mode Completeness
-- ============================================================================

SELECT 'TEST 6: Attendance Mode Seeding' as test_name;

SELECT
  CASE
    WHEN COUNT(*) = 3 THEN 'PASS'
    ELSE 'FAIL: Expected 3 attendance modes, got ' || COUNT(*)
  END as result
FROM attendance_mode;

-- ============================================================================
-- TEST 7: User Role Completeness
-- ============================================================================

SELECT 'TEST 7: User Role Seeding' as test_name;

SELECT
  CASE
    WHEN COUNT(*) = 2 THEN 'PASS'
    ELSE 'FAIL: Expected 2 user roles, got ' || COUNT(*)
  END as result
FROM user_role;

-- Verify permissions field is valid JSON
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS'
    ELSE 'FAIL: Found user_role with invalid permissions JSON'
  END as result
FROM user_role
WHERE json(permissions) IS NULL;

-- ============================================================================
-- TEST 8: Consent Status Completeness
-- ============================================================================

SELECT 'TEST 8: Consent Status Seeding' as test_name;

SELECT
  CASE
    WHEN COUNT(*) = 3 THEN 'PASS'
    ELSE 'FAIL: Expected 3 consent statuses, got ' || COUNT(*)
  END as result
FROM consent_status;

-- ============================================================================
-- TEST 9: Document Type Completeness
-- ============================================================================

SELECT 'TEST 9: Document Type Seeding' as test_name;

SELECT
  CASE
    WHEN COUNT(*) >= 5 THEN 'PASS'
    ELSE 'FAIL: Expected at least 5 document types, got ' || COUNT(*)
  END as result
FROM document_type;

-- ============================================================================
-- TEST 10: Collection Method Completeness
-- ============================================================================

SELECT 'TEST 10: Collection Method Seeding' as test_name;

SELECT
  CASE
    WHEN COUNT(*) = 4 THEN 'PASS'
    ELSE 'FAIL: Expected 4 collection methods, got ' || COUNT(*)
  END as result
FROM collection_method;

-- ============================================================================
-- TEST 11: Compliance Role Type Completeness
-- ============================================================================

SELECT 'TEST 11: Compliance Role Type Seeding' as test_name;

SELECT
  CASE
    WHEN COUNT(*) >= 4 THEN 'PASS'
    ELSE 'FAIL: Expected at least 4 compliance role types, got ' || COUNT(*)
  END as result
FROM compliance_role_type;

-- ============================================================================
-- TEST 12: Uniqueness Constraints
-- ============================================================================

SELECT 'TEST 12: Code Uniqueness' as test_name;

-- Verify code uniqueness in each table
SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM (
      SELECT code FROM assembly_type UNION ALL
      SELECT code FROM assembly_subtype UNION ALL
      SELECT code FROM assembly_status UNION ALL
      SELECT code FROM mode_option UNION ALL
      SELECT code FROM volunteer_status UNION ALL
      SELECT code FROM attendance_mode UNION ALL
      SELECT code FROM user_role UNION ALL
      SELECT code FROM consent_status UNION ALL
      SELECT code FROM document_type UNION ALL
      SELECT code FROM collection_method UNION ALL
      SELECT code FROM compliance_role_type
    )) = (
      SELECT COUNT(DISTINCT code) FROM (
        SELECT code FROM assembly_type UNION ALL
        SELECT code FROM assembly_subtype UNION ALL
        SELECT code FROM assembly_status UNION ALL
        SELECT code FROM mode_option UNION ALL
        SELECT code FROM volunteer_status UNION ALL
        SELECT code FROM attendance_mode UNION ALL
        SELECT code FROM user_role UNION ALL
        SELECT code FROM consent_status UNION ALL
        SELECT code FROM document_type UNION ALL
        SELECT code FROM collection_method UNION ALL
        SELECT code FROM compliance_role_type
      )
    ) THEN 'PASS: All codes are globally unique'
    ELSE 'FAIL: Found duplicate codes across tables'
  END as result;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 'Phase 1 Data Mapping Tests Complete' as summary;
SELECT COUNT(*) as total_lookup_records FROM (
  SELECT id FROM assembly_type
  UNION ALL SELECT id FROM assembly_subtype
  UNION ALL SELECT id FROM assembly_status
  UNION ALL SELECT id FROM assembly_location
  UNION ALL SELECT id FROM mode_option
  UNION ALL SELECT id FROM volunteer_status
  UNION ALL SELECT id FROM attendance_mode
  UNION ALL SELECT id FROM user_role
  UNION ALL SELECT id FROM consent_status
  UNION ALL SELECT id FROM document_type
  UNION ALL SELECT id FROM collection_method
  UNION ALL SELECT id FROM compliance_role_type
);
