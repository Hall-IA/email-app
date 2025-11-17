/*
  # Remove unused knowledge base columns from email_configurations

  1. Changes
    - Remove `knowledge_base_pdf_name` (not needed - info is in knowledge_base_pdfs jsonb)
    - Remove `knowledge_base_pdf_url` (not needed - info is in knowledge_base_pdfs jsonb)
    - Remove `knowledge_base_pdf_base64` (not needed - info is in knowledge_base_pdfs jsonb)

  2. Notes
    - These columns were added for "backward compatibility" but are not actually used
    - All PDF information is stored in the knowledge_base_pdfs jsonb column
*/

-- Remove knowledge_base_pdf_name column
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_configurations' AND column_name = 'knowledge_base_pdf_name'
  ) THEN
    ALTER TABLE email_configurations DROP COLUMN knowledge_base_pdf_name;
  END IF;
END $$;

-- Remove knowledge_base_pdf_url column
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_configurations' AND column_name = 'knowledge_base_pdf_url'
  ) THEN
    ALTER TABLE email_configurations DROP COLUMN knowledge_base_pdf_url;
  END IF;
END $$;

-- Remove knowledge_base_pdf_base64 column
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_configurations' AND column_name = 'knowledge_base_pdf_base64'
  ) THEN
    ALTER TABLE email_configurations DROP COLUMN knowledge_base_pdf_base64;
  END IF;
END $$;

