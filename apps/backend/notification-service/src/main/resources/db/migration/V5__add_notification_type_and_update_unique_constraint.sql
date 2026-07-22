ALTER TABLE notification_send
    ADD COLUMN notification_type VARCHAR(64);

UPDATE notification_send
SET notification_type = 'MATCH_FINISHED'
WHERE notification_type IS NULL;

ALTER TABLE notification_send
    ALTER COLUMN notification_type SET NOT NULL;

ALTER TABLE notification_send
    DROP CONSTRAINT IF EXISTS uix_notification_send_user_match;

ALTER TABLE notification_send
    ADD CONSTRAINT uix_notification_send_user_match_type
        UNIQUE (user_id, match_id, notification_type);