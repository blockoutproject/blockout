ALTER TABLE pools
  DROP CONSTRAINT IF EXISTS pools_format_check;

ALTER TABLE pools
  ADD CONSTRAINT pools_format_check
    CHECK (format IN ('SIX', 'FOUR', 'TWO'));
