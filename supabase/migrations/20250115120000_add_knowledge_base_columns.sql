/*
  # Add knowledge base columns to email_configurations

  1. Changes
    - Add knowledge_base_urls (jsonb) - Array of URLs for knowledge base
    - Add knowledge_base_pdfs (jsonb) - Array of PDFs with name and base64
    - Add knowledge_base_synced_at (timestamptz) - Last sync timestamp
    - Add knowledge_base_pdf_name (text) - Name of the PDF file (for backward compatibility)
    - Add knowledge_base_pdf_url (text) - URL of the PDF (for backward compatibility)
    - Add knowledge_base_pdf_base64 (text) - Base64 content of the PDF (for backward compatibility)

  2. Notes
    - These columns are needed for RAG (Retrieval-Augmented Generation) knowledge base integration
    - knowledge_base_urls stores an array of URLs as JSON
    - knowledge_base_pdfs stores an array of objects with {name, base64} as JSON
*/

-- Add knowledge_base_urls column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_configurations' AND column_name = 'knowledge_base_urls'
  ) THEN
    ALTER TABLE email_configurations ADD COLUMN knowledge_base_urls jsonb;
  END IF;
END $$;

-- Add knowledge_base_pdfs column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_configurations' AND column_name = 'knowledge_base_pdfs'
  ) THEN
    ALTER TABLE email_configurations ADD COLUMN knowledge_base_pdfs jsonb;
  END IF;
END $$;

-- Add knowledge_base_synced_at column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_configurations' AND column_name = 'knowledge_base_synced_at'
  ) THEN
    ALTER TABLE email_configurations ADD COLUMN knowledge_base_synced_at timestamptz;
  END IF;
END $$;

-- Add knowledge_base_pdf_name column (for backward compatibility)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_configurations' AND column_name = 'knowledge_base_pdf_name'
  ) THEN
    ALTER TABLE email_configurations ADD COLUMN knowledge_base_pdf_name text;
  END IF;
END $$;

-- Add knowledge_base_pdf_url column (for backward compatibility)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_configurations' AND column_name = 'knowledge_base_pdf_url'
  ) THEN
    ALTER TABLE email_configurations ADD COLUMN knowledge_base_pdf_url text;
  END IF;
END $$;

-- Add knowledge_base_pdf_base64 column (for backward compatibility)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_configurations' AND column_name = 'knowledge_base_pdf_base64'
  ) THEN
    ALTER TABLE email_configurations ADD COLUMN knowledge_base_pdf_base64 text;
  END IF;
END $$;

