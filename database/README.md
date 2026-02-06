# DejaVista Database Setup

This folder contains all SQL needed to set up Supabase from scratch.

## Quick Setup

Run these files **in order** in the Supabase SQL Editor:

1. **001_closet_items.sql** - Creates the main table and RLS policies
2. **002_storage_policies.sql** - Sets up storage bucket policies

## Manual Steps Required

### 1. Create Storage Bucket (before running 002)

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Name: `user_photos`
4. Set to **Private** (not public)
5. Click **Create bucket**

### 2. Enable Google OAuth

1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth Client ID and Secret
4. Add redirect URL: `https://<YOUR_PROJECT>.supabase.co/auth/v1/callback`

## Schema Overview

### Table: `closet_items`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | References auth.users |
| `url` | TEXT | Image URL of the item |
| `meta` | JSONB | Metadata (title, price, site, etc.) |
| `created_at` | TIMESTAMP | When item was tracked |

### Storage: `user_photos`

- Path pattern: `{user_id}/reference.jpg`
- Each user can store one reference photo
- Used for AI try-on feature
