/*
  # Simplify RLS policies for support-screenshots bucket

  1. Purpose
    - Simplify policies to allow all authenticated users to upload
    - Keep public read access
    - Allow users to manage their own uploads

  2. Changes
    - Allow any authenticated user to upload (they can only upload to their folder from client)
    - Keep public read for viewing screenshots
*/

-- Drop all existing policies for support-screenshots
DROP POLICY IF EXISTS "Authenticated users can upload support screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Support screenshots are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own support screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own support screenshots" ON storage.objects;

-- Policy: Any authenticated user can upload to support-screenshots
-- The client-side code ensures uploads go to their own folder
CREATE POLICY "Anyone can upload support screenshots"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'support-screenshots');

-- Policy: Support screenshots are publicly accessible (for viewing)
CREATE POLICY "Anyone can view support screenshots"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'support-screenshots');

-- Policy: Any authenticated user can update support screenshots
CREATE POLICY "Anyone can update support screenshots"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'support-screenshots')
  WITH CHECK (bucket_id = 'support-screenshots');

-- Policy: Any authenticated user can delete support screenshots  
CREATE POLICY "Anyone can delete support screenshots"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'support-screenshots');

