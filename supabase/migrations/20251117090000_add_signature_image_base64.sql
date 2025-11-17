/*
  # Add signature_image_base64 column to email_configurations

  1. Changes
    - Add `signature_image_base64` text column to `email_configurations` table
    - This will store the base64 encoded signature image
    - Nullable field (not all accounts will have a signature image)

  2. Notes
    - Used for storing email signature images
    - Base64 format allows storing images directly in the database
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_configurations' AND column_name = 'signature_image_base64'
  ) THEN
    ALTER TABLE email_configurations ADD COLUMN signature_image_base64 text;
  END IF;
END $$;

