-- Migration: Add compliance_rules column to app_setting table
-- The compliance engine will fall back to the static JSON file if this column is NULL.
ALTER TABLE app_setting ADD COLUMN compliance_rules TEXT;
