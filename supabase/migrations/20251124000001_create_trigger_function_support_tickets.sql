/*
  # Create trigger function for support_tickets updated_at

  1. Purpose
    - Automatically update the updated_at timestamp when a support ticket is modified

  2. Function
    - update_support_tickets_updated_at() - Sets updated_at to current timestamp
*/

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_support_tickets_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION update_support_tickets_updated_at() TO service_role;

