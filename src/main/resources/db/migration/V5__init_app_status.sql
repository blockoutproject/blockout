CREATE TABLE IF NOT EXISTS app_status (
    id BIGSERIAL PRIMARY KEY,
    maintenance BOOLEAN NOT NULL DEFAULT FALSE,
    message VARCHAR(1024),
    image_url VARCHAR(2048),
    last_update TIMESTAMP
);

INSERT INTO app_status (maintenance, message, image_url, last_update)
VALUES (FALSE, NULL, NULL, NOW());