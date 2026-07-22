ALTER TABLE user_notifications
    DROP CONSTRAINT IF EXISTS chk_user_notifications_type;

ALTER TABLE user_notifications
    ADD CONSTRAINT chk_user_notifications_type
        CHECK (type IN (
            'MATCH_FINISHED',
            'GENERIC',
            'MATCH_LIVE_LINK_CREATED'
        ));