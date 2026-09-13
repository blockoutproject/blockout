-- Isolated local bootstrap. Production credentials are provisioned independently.
CREATE ROLE blockout_migration LOGIN PASSWORD 'local-migration';
CREATE ROLE blockout_api LOGIN PASSWORD 'local-api';
CREATE ROLE blockout_worker LOGIN PASSWORD 'local-worker';
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA operations AUTHORIZATION blockout_migration;
CREATE SCHEMA migrations AUTHORIZATION blockout_migration;
GRANT USAGE ON SCHEMA operations TO blockout_api, blockout_worker;
CREATE SCHEMA identity AUTHORIZATION blockout_migration;
GRANT USAGE ON SCHEMA identity TO blockout_api, blockout_worker;
CREATE SCHEMA sports AUTHORIZATION blockout_migration;
GRANT USAGE ON SCHEMA sports TO blockout_api, blockout_worker;
