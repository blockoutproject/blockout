ALTER TABLE teams
  DROP CONSTRAINT IF EXISTS teams_format_check;

ALTER TABLE teams
  ADD CONSTRAINT teams_format_check
    CHECK (format IN ('SIX', 'FOUR', 'TWO'));
