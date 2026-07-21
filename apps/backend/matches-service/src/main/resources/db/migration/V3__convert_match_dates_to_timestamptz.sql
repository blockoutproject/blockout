ALTER TABLE matches
  ALTER COLUMN match_date TYPE TIMESTAMPTZ
    USING match_date AT TIME ZONE 'Europe/Paris';

ALTER TABLE matches
  ALTER COLUMN created_at TYPE TIMESTAMPTZ
    USING created_at AT TIME ZONE 'Europe/Paris';

ALTER TABLE matches
  ALTER COLUMN last_update TYPE TIMESTAMPTZ
    USING last_update AT TIME ZONE 'Europe/Paris';
