-- Disposable local development only. Production roles belong to explicit operations.
\getenv app_password BLOCKOUT_APP_PASSWORD
\getenv migration_password BLOCKOUT_MIGRATION_PASSWORD

CREATE ROLE blockout_migration LOGIN PASSWORD :'migration_password';
CREATE ROLE blockout_app LOGIN PASSWORD :'app_password';
CREATE DATABASE blockout OWNER blockout_migration;

\connect blockout
REVOKE ALL ON DATABASE blockout FROM PUBLIC;
GRANT CONNECT ON DATABASE blockout TO blockout_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO blockout_migration;
GRANT USAGE ON SCHEMA public TO blockout_app;
ALTER DEFAULT PRIVILEGES FOR ROLE blockout_migration IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO blockout_app;
ALTER DEFAULT PRIVILEGES FOR ROLE blockout_migration IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO blockout_app;
