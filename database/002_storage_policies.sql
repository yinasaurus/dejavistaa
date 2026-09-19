-- DejaVista Storage Setup
-- Run this in Supabase SQL Editor after creating the private `user_photos` bucket.
-- Safe to re-run: policies are dropped then recreated.

-- 1. CREATE STORAGE BUCKET (Dashboard UI)
--    Storage → New bucket → Name: user_photos → Private → Enable RLS

DROP POLICY IF EXISTS "Users upload own photos" ON storage.objects;
CREATE POLICY "Users upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users view own photos" ON storage.objects;
CREATE POLICY "Users view own photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users update own photos" ON storage.objects;
CREATE POLICY "Users update own photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own photos" ON storage.objects;
CREATE POLICY "Users delete own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
