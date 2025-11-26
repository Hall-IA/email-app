/*
  # Create Support Tickets Table

  1. New Table
    - `support_tickets`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, references auth.users) - User who submitted the ticket (nullable for non-authenticated users)
      - `name` (text, not null) - Name of the person submitting
      - `email` (text, not null) - Contact email
      - `category` (text, not null) - Ticket category
      - `subject` (text, not null) - Ticket subject
      - `message` (text, not null) - Ticket message
      - `screenshots` (jsonb) - Array of screenshot URLs
      - `status` (text, not null) - Ticket status (new, in_progress, resolved, closed)
      - `admin_notes` (text) - Notes from support team
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `support_tickets` table
    - Allow users to view their own tickets
    - Allow authenticated users to create tickets
*/

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  category text NOT NULL CHECK (category IN ('question', 'bug', 'feature', 'other')),
  subject text NOT NULL,
  message text NOT NULL,
  screenshots jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

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
  WITH CHECK (true); -- Allow any authenticated user to create a ticket

-- Policy: Service role can manage all tickets (for admin panel)
CREATE POLICY "Service role can manage all tickets"
  ON support_tickets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create trigger function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

