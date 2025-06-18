DROP DATABASE IF EXISTS blockout_config;
DROP USER IF EXISTS 'blockout_config_admin'@'localhost';
CREATE database blockout_config;
CREATE USER IF NOT EXISTS 'blockout_config_admin'@'localhost' IDENTIFIED BY 'admin';
GRANT ALL PRIVILEGES ON blockout_config.* TO 'blockout_config_admin'@'localhost';
FLUSH PRIVILEGES;