ALTER TABLE raw_division_mapping
  DROP CONSTRAINT IF EXISTS raw_division_mapping_format_check;

ALTER TABLE raw_division_mapping
  ADD CONSTRAINT raw_division_mapping_format_check
    CHECK (format IN ('SIX', 'FOUR', 'TWO'));
