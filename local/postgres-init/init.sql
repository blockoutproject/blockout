DROP DATABASE IF EXISTS blockout_clubs;
DROP USER IF EXISTS 'blockout_clubs_admin'@'localhost';
CREATE database blockout_clubs;
CREATE USER IF NOT EXISTS 'blockout_clubs_admin'@'localhost' IDENTIFIED BY 'admin';
GRANT ALL PRIVILEGES ON blockout_clubs.* TO 'blockout_clubs_admin'@'localhost';
FLUSH PRIVILEGES;