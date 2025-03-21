DROP DATABASE IF EXISTS blockout_users;
DROP USER IF EXISTS 'blockout_users_admin'@'localhost';
CREATE database blockout_users;
CREATE USER IF NOT EXISTS 'blockout_users_admin'@'localhost' IDENTIFIED BY 'admin';
GRANT ALL PRIVILEGES ON blockout_users.* TO 'blockout_users_admin'@'localhost';
FLUSH PRIVILEGES;