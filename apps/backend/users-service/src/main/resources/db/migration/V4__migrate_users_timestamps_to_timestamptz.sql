ALTER TABLE users
    ALTER COLUMN created_at TYPE TIMESTAMPTZ
    USING created_at AT TIME ZONE 'Europe/Paris';

ALTER TABLE users
    ALTER COLUMN last_update TYPE TIMESTAMPTZ
    USING last_update AT TIME ZONE 'Europe/Paris';