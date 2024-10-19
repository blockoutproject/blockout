DROP DATABASE IF EXISTS myvolley;
DROP USER IF EXISTS 'myvolleyAdmin'@'localhost';
CREATE database myvolley;
CREATE USER IF NOT EXISTS 'myvolleyAdmin'@'localhost' IDENTIFIED BY 'admin';
GRANT ALL PRIVILEGES ON myvolley.* TO 'myvolleyAdmin'@'localhost';
FLUSH PRIVILEGES;