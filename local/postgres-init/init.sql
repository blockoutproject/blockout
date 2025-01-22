DROP DATABASE IF EXISTS blockout_competitions;
DROP USER IF EXISTS 'blockout_competitions_admin'@'localhost';
CREATE database blockout_competitions;
CREATE USER IF NOT EXISTS 'blockout_competitions_admin'@'localhost' IDENTIFIED BY 'admin';
GRANT ALL PRIVILEGES ON blockout_competitions.* TO 'blockout_competitions_admin'@'localhost';
FLUSH PRIVILEGES;