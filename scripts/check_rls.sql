-- Run this in your Supabase SQL Editor to check for RLS blocks
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'tasks';

-- Ensure there is an UPDATE policy for the 'authenticated' or 'anon' role
