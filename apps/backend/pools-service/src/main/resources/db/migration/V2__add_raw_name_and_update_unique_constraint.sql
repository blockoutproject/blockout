ALTER TABLE pools
DROP CONSTRAINT IF EXISTS uix_team;

ALTER TABLE pools
ADD COLUMN raw_name VARCHAR(255);

ALTER TABLE pools
ADD COLUMN short_name VARCHAR(255);

UPDATE pools
SET raw_name = name;

UPDATE pools
SET short_name = name;

ALTER TABLE pools
ALTER COLUMN raw_name SET NOT NULL;

ALTER TABLE pools
ALTER COLUMN short_name SET NOT NULL;