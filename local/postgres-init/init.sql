DROP DATABASE IF EXISTS blockout_pools;
DROP USER IF EXISTS 'blockout_pools_admin'@'localhost';
CREATE database blockout_pools;
CREATE USER IF NOT EXISTS 'blockout_pools_admin'@'localhost' IDENTIFIED BY 'admin';
GRANT ALL PRIVILEGES ON blockout_pools.* TO 'blockout_pools_admin'@'localhost';
FLUSH PRIVILEGES;