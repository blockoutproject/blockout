DROP DATABASE IF EXISTS blockout_matches;
DROP USER IF EXISTS 'blockout_matches_admin'@'localhost';
CREATE database blockout_matches;
CREATE USER IF NOT EXISTS 'blockout_matches_admin'@'localhost' IDENTIFIED BY 'admin';
GRANT ALL PRIVILEGES ON blockout_matches.* TO 'blockout_matches_admin'@'localhost';
FLUSH PRIVILEGES;