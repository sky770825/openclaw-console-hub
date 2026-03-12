-- ==========================================
-- Migration: Create Users Table and RLS
-- Description: Sets up the core user identity table with role-based access control.
-- ==========================================

-- Enable UUID extension for high-entropy primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Role Enumeration
-- Ensures only valid roles can be assigned
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin');
    END IF;
END $$;

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- email must be unique and valid format (basic check)
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 3. Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Row Level Security Policies

-- POLICY: Users can view their own data
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- POLICY: Users can update their own data (excluding role)
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- POLICY: Staff can view all customer profiles
DROP POLICY IF EXISTS "Staff can view customers" ON public.users;
CREATE POLICY "Staff can view customers" ON public.users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('staff', 'admin')
        )
    );

-- POLICY: Admins have full access
DROP POLICY IF EXISTS "Admins have full access" ON public.users;
CREATE POLICY "Admins have full access" ON public.users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Auto-update updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_users_updated_at ON public.users;
CREATE TRIGGER tr_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Documentation
COMMENT ON TABLE public.users IS 'Stores user accounts and authorization roles.';
COMMENT ON COLUMN public.users.password_hash IS 'Securely hashed password string.';
COMMENT ON COLUMN public.users.role IS 'User permission level: customer, staff, or admin.';
