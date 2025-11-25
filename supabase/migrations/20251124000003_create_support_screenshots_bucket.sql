/*
  # Create support-screenshots storage bucket

  1. Purpose
    - Create a public bucket for storing support ticket screenshots
    - Set up RLS policies to allow authenticated users to upload

  2. Bucket Configuration
    - Public bucket for easy access
    - Authenticated users can upload
*/

-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-screenshots',
  'support-screenshots',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg'];

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload support screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Support screenshots are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own support screenshots" ON storage.objects;

-- Policy: Authenticated users can upload to support-screenshots bucket
CREATE POLICY "Authenticated users can upload support screenshots"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Support screenshots are publicly accessible (for viewing)
CREATE POLICY "Support screenshots are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'support-screenshots');

-- Policy: Users can delete their own support screenshots
CREATE POLICY "Users can delete their own support screenshots"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'support-screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

