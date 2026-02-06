-- DejaVista Storage Setup
-- Run this in Supabase SQL Editor to set up storage bucket and policies

-- ============================================
-- 1. CREATE STORAGE BUCKET
-- Note: This must be done via Supabase Dashboard UI:
-- 1. Go to Storage
-- 2. Click "New bucket"
-- 3. Name: user_photos
-- 4. Make it Private (not public)
-- 5. Enable RLS
-- ============================================

-- ============================================
-- 2. STORAGE RLS POLICIES
-- Run these after creating the bucket
-- ============================================

-- Users can upload their own photos
-- Path pattern: {user_id}/reference.jpg
CREATE POLICY "Users upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own photos
CREATE POLICY "Users view own photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own photos
CREATE POLICY "Users update own photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own photos
CREATE POLICY "Users delete own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
