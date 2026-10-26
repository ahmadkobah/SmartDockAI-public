-- SmartDockAI Database Setup
-- This script creates the database and user for SmartDockAI

-- Create user if not exists
CREATE USER smartdock_user WITH PASSWORD 'smartdock_password';

-- Create database
CREATE DATABASE smartdock_db OWNER smartdock_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE smartdock_db TO smartdock_user;