ALTER TABLE teams
  DROP CONSTRAINT IF EXISTS uix_team;

ALTER TABLE teams
  ADD COLUMN raw_name VARCHAR(255);

UPDATE teams
SET raw_name = name;

ALTER TABLE teams
  ALTER COLUMN raw_name SET NOT NULL;

ALTER TABLE teams
  ADD CONSTRAINT uix_team UNIQUE (club_id, division_id, format, gender, raw_name, season);
