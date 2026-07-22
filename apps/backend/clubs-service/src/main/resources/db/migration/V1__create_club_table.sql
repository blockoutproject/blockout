CREATE TABLE clubs (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    raw_name VARCHAR(255) NOT NULL,
    city VARCHAR(255),
    postal_code VARCHAR(255),
    email VARCHAR(255),
    phone_number VARCHAR(255),
    website VARCHAR(255),
    logo_url VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP(6),
    last_update TIMESTAMP(6)
);