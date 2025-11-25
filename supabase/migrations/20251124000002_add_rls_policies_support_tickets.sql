/*
  # Add RLS policies for support_tickets

  1. Purpose
    - Enable Row Level Security on support_tickets table
    - Allow users to view their own tickets
    - Allow authenticated users to create tickets
    - Allow users to update their own tickets

  2. Policies
    - Users can view own tickets
    - Authenticated users can create tickets
    - Users can update own tickets (for status changes, etc.)
*/

-- Enable RLS if not already enabled
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON support_tickets;

-- Policy: Users can view their own tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Authenticated users can create tickets
CREATE POLICY "Authenticated users can create tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tickets (for status updates, etc.)
CREATE POLICY "Users can update own tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

