-- ==============================================
-- RLS Policies for Task Board
-- ==============================================

-- Helper function to check if a user is a member of a board
-- This assumes a `board_members` table exists with `board_id` and `user_id` columns.
CREATE OR REPLACE FUNCTION is_board_member(board_id_to_check uuid, user_id_to_check uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM board_members
    WHERE board_id = board_id_to_check AND user_id = user_id_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. Policies for `boards` table
-- ----------------------------------------------

-- First, enable RLS on the table
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- Allow members to see the board
DROP POLICY IF EXISTS "Allow members to read boards" ON boards;
CREATE POLICY "Allow members to read boards"
  ON boards FOR SELECT
  USING (is_board_member(id, auth.uid()));

-- Allow members to update the board
DROP POLICY IF EXISTS "Allow members to update boards" ON boards;
CREATE POLICY "Allow members to update boards"
  ON boards FOR UPDATE
  USING (is_board_member(id, auth.uid()));

-- Allow members to delete the board
DROP POLICY IF EXISTS "Allow members to delete boards" ON boards;
CREATE POLICY "Allow members to delete boards"
  ON boards FOR DELETE
  USING (is_board_member(id, auth.uid()));

-- Allow any authenticated user to create a new board
-- (The application logic should handle adding the creator to `board_members`)
DROP POLICY IF EXISTS "Allow authenticated users to create boards" ON boards;
CREATE POLICY "Allow authenticated users to create boards"
  ON boards FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- 2. Policies for `lists` table
-- ----------------------------------------------

-- Enable RLS
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

-- Allow board members to see lists within a board
DROP POLICY IF EXISTS "Allow members to read lists" ON lists;
CREATE POLICY "Allow members to read lists"
  ON lists FOR SELECT
  USING (is_board_member(board_id, auth.uid()));

-- Allow board members to create lists
DROP POLICY IF EXISTS "Allow members to create lists" ON lists;
CREATE POLICY "Allow members to create lists"
  ON lists FOR INSERT
  WITH CHECK (is_board_member(board_id, auth.uid()));

-- Allow board members to update lists
DROP POLICY IF EXISTS "Allow members to update lists" ON lists;
CREATE POLICY "Allow members to update lists"
  ON lists FOR UPDATE
  USING (is_board_member(board_id, auth.uid()));

-- Allow board members to delete lists
DROP POLICY IF EXISTS "Allow members to delete lists" ON lists;
CREATE POLICY "Allow members to delete lists"
  ON lists FOR DELETE
  USING (is_board_member(board_id, auth.uid()));


-- 3. Policies for `cards` table
-- ----------------------------------------------

-- Enable RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Allow board members to see cards
-- This requires joining through the `lists` table to get the `board_id`
DROP POLICY IF EXISTS "Allow members to read cards" ON cards;
CREATE POLICY "Allow members to read cards"
  ON cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM lists
      WHERE lists.id = cards.list_id AND is_board_member(lists.board_id, auth.uid())
    )
  );

-- Allow board members to create cards
DROP POLICY IF EXISTS "Allow members to create cards" ON cards;
CREATE POLICY "Allow members to create cards"
  ON cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM lists
      WHERE lists.id = cards.list_id AND is_board_member(lists.board_id, auth.uid())
    )
  );

-- Allow board members to update cards
DROP POLICY IF EXISTS "Allow members to update cards" ON cards;
CREATE POLICY "Allow members to update cards"
  ON cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM lists
      WHERE lists.id = cards.list_id AND is_board_member(lists.board_id, auth.uid())
    )
  );

-- Allow board members to delete cards
DROP POLICY IF EXISTS "Allow members to delete cards" ON cards;
CREATE POLICY "Allow members to delete cards"
  ON cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM lists
      WHERE lists.id = cards.list_id AND is_board_member(lists.board_id, auth.uid())
    )
  );
