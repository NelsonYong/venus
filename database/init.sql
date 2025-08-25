-- database/init.sql
-- 创建额外的数据库
CREATE DATABASE myapp_test;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 初始表结构（如果不使用 Prisma）
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);