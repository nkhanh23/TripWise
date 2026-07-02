-- V2__add_status_to_users.sql
-- Thêm cột status vào bảng users

ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
