-- DejaVista Database Schema
-- Run this in Supabase SQL Editor to set up the database from scratch
-- Safe to re-run: policies are dropped then recreated.

-- ============================================
-- 1. CLOSET ITEMS TABLE
-- Stores tracked clothing items from user browsing
-- ============================================

CREATE TABLE IF NOT EXISTS closet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_closet_user_date ON closet_items(user_id, created_at DESC);

-- ============================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE closet_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own items" ON closet_items;
CREATE POLICY "Users view own items" ON closet_items
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own items" ON closet_items;
CREATE POLICY "Users insert own items" ON closet_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own items" ON closet_items;
CREATE POLICY "Users update own items" ON closet_items
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own items" ON closet_items;
CREATE POLICY "Users delete own items" ON closet_items
  FOR DELETE USING (auth.uid() = user_id);
