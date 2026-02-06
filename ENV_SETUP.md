# Environment Variables Setup

## Quick Fix for "Missing Supabase environment variables" Error

This error occurs because the `.env` file is missing or the extension wasn't rebuilt after creating it.

### Step 1: Create `.env` File

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Or create `.env` manually** in the `dejavista` folder with:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_VERCEL_API_URL=https://dejavista.vercel.app
   
   # SERVER-SIDE VARIABLES (Vercel / Local Backend)
   # NEVER include these in client-side builds or commit to git
   GEMINI_API_KEY=your-gemini-api-key
   GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
   # GOOGLE_APPLICATION_CREDENTIALS is usually auto-handled by Vercel/GCP, 
   # but if running locally, point to your service-account.json
   # GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
   ```

### Step 2: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### Step 3: Rebuild the Extension

**Important:** After creating/updating `.env`, you MUST rebuild:

```bash
npm run build
```

### Step 4: Reload Extension in Chrome

1. Go to `chrome://extensions/`
2. Find your DejaVista extension
3. Click the **reload** button (🔄)

## Why This Happens

- Environment variables are injected at **build time** by Vite
- The `.env` file must exist **before** running `npm run build`
- If you update `.env` after building, you need to rebuild

4. Reload the extension in Chrome

## Critical Security Warning

The backend APIs (`/api/ai/*`) rely on Google Cloud processing.
You **MUST** set `GOOGLE_CLOUD_PROJECT_ID` in your Vercel Environment Variables.
Older versions of this code had a hardcoded fallback ID which has been removed for security.
If you see errors like "GOOGLE_CLOUD_PROJECT_ID environment variable is missing", this is why.

## Verification


After rebuilding, check the console:
- ✅ No "Missing Supabase environment variables" error
- ✅ Extension loads without errors
- ✅ Sign-in button appears

## Troubleshooting

**Still seeing the error?**
1. Verify `.env` file exists in `dejavista/` folder (not `dejavista/src/`)
2. Check `.env` file has no syntax errors (no quotes around values unless needed)
3. Make sure you ran `npm run build` after creating `.env`
4. Reload the extension in Chrome

**File format:**
```env
# ✅ Correct
VITE_SUPABASE_URL=https://abc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ Wrong (don't use quotes unless the value itself contains spaces)
VITE_SUPABASE_URL="https://abc123.supabase.co"
```
