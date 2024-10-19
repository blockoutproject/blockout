DROP DATABASE IF EXISTS blockout_teams;
DROP USER IF EXISTS 'blockout_teams_admin'@'localhost';
CREATE database blockout_teams;
CREATE USER IF NOT EXISTS 'blockout_teams_admin'@'localhost' IDENTIFIED BY 'admin';
GRANT ALL PRIVILEGES ON blockout_teams.* TO 'blockout_teams_admin'@'localhost';
FLUSH PRIVILEGES;