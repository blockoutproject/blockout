CREATE TABLE legal_documents (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP(6),
    last_update TIMESTAMP(6)
);

INSERT INTO legal_documents (type, title, version, content)
VALUES 
    ('terms', 'Conditions générales d’utilisation', '2025-08-08', 'Contenu des CGU ici...'),
    ('privacy', 'Politique de confidentialité', '2025-08-08', 'Contenu de la politique de confidentialité ici...'),
    ('imprint', 'Mentions légales', '2025-08-08', 'Contenu des mentions légales ici...');