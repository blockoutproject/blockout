ALTER TABLE match_live_links
    DROP CONSTRAINT IF EXISTS match_live_links_status_check;

UPDATE match_live_links
SET status = 'DEACTIVATED'
WHERE status = 'HIDDEN';

ALTER TABLE match_live_links
    ADD CONSTRAINT match_live_links_status_check
    CHECK (
        status IN (
            'ACTIVE',
            'DEACTIVATED',
            'BAN',
            'EXPIRED',
            'PENDING',
            'REJECTED'
        )
    );