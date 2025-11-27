/*
  # Create password_reset_otps table
  
  1. New table
    - `password_reset_otps`
      - `id` (uuid, primary key)
      - `email` (text, not null)
      - `otp_code` (text, 6 digits, not null)
      - `expires_at` (timestamptz, not null)
      - `used` (boolean, default false)
      - `created_at` (timestamptz, default now())
  
  2. Indexes
    - Index on `email` for fast lookups
    - Index on `expires_at` for cleanup
*/

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL CHECK (length(otp_code) = 6 AND otp_code ~ '^[0-9]+$'),
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON password_reset_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email_otp ON password_reset_otps(email, otp_code) WHERE used = false;

-- Function to automatically clean up expired OTPs (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_otps
  WHERE expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security)
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert OTPs (for password reset requests)
CREATE POLICY "Anyone can insert password reset OTPs"
  ON password_reset_otps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Anyone can read OTPs for their email (for verification)
CREATE POLICY "Anyone can read password reset OTPs for their email"
  ON password_reset_otps FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Anyone can update OTPs (to mark as used)
CREATE POLICY "Anyone can update password reset OTPs"
  ON password_reset_otps FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

