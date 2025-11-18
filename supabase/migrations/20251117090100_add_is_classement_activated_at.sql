/*
  # Add is_classement_activated_at column to email_configurations

  1. Changes
    - Add `is_classement_activated_at` timestamptz column to `email_configurations` table
    - This tracks when the classement feature was activated for an account
    - Nullable field (only set when classement is actually activated)

  2. Notes
    - Used for tracking activation timestamps of the email classification feature
    - Helps with analytics and feature usage tracking
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_configurations' AND column_name = 'is_classement_activated_at'
  ) THEN
    ALTER TABLE email_configurations ADD COLUMN is_classement_activated_at timestamptz;
  END IF;
END $$;

