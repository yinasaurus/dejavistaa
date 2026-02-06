# DejaVista Setup Guide

This guide will walk you through setting up all the required services and API keys for DejaVista.

## Prerequisites

- Node.js 18+ installed
- Google account (for OAuth and AI services)
- Chrome browser for development

---

## 1. Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name:** DejaVista
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to you
4. Wait for project to be created (~2 minutes)

### 1.2 Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_KEY` (keep this secret!)

### 1.3 Enable Google OAuth

1. Go to **Authentication** → **Providers**
2. Enable **Google** provider
3. You'll need to set up OAuth credentials in Google Cloud (see section 2.3)
4. Add redirect URL: `https://<YOUR_EXTENSION_ID>.chromiumapp.org/`
   - You'll get your extension ID after building the extension

### 1.4 Create Database Tables

1. Go to **SQL Editor**
2. Run this SQL to create the `closet_items` table:

```sql
CREATE TABLE closet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_closet_user_date ON closet_items(user_id, created_at DESC);
```

3. Enable Row Level Security (RLS):

```sql
ALTER TABLE closet_items ENABLE ROW LEVEL SECURITY;
```

4. Create RLS policies:

```sql
-- Users can only read their own items
CREATE POLICY "Users view own items" ON closet_items
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own items
CREATE POLICY "Users insert own items" ON closet_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own items
CREATE POLICY "Users delete own items" ON closet_items
  FOR DELETE USING (auth.uid() = user_id);
```

### 1.5 Create Storage Bucket

1. Go to **Storage**
2. Click **New bucket**
3. Name: `user_photos`
4. Make it **Private** (not public)
5. Enable RLS
6. Create storage policy:

```sql
-- Users can upload their own photos
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

-- Users can delete their own photos
CREATE POLICY "Users delete own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 2. Google Cloud Platform Setup

### 2.1 Create GCP Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Name: `DejaVista`
4. Click **Create**

### 2.2 Enable APIs

1. Go to **APIs & Services** → **Library**
2. Enable these APIs:
   - **Vertex AI API**
   - **Generative Language API** (for Gemini)

### 2.3 Create OAuth 2.0 Credentials

> **Note:** You need your Extension ID before completing this step. If you don't have it yet, skip to **Section 4** first to build and load the extension, get your ID, then come back here.

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure OAuth consent screen:
   - **User Type:** External
   - **App name:** DejaVista
   - **Support email:** Your email
   - **Developer contact:** Your email
   - **Scopes:** email, profile, openid
4. Create OAuth client:
   - **Application type:** Web application (NOT Chrome App)
   - **Name:** DejaVista Extension
5. Under **Authorized redirect URIs**, add:
   - `https://<YOUR_EXTENSION_ID>.chromiumapp.org/`
   - Replace `<YOUR_EXTENSION_ID>` with your actual extension ID from Chrome
6. Copy the **Client ID** → Update `src/manifest.json` with this value

### 2.4 Get Gemini API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the API key → `GEMINI_API_KEY`
4. (Optional) Restrict the key to Generative Language API

### 2.5 Set Up Vertex AI (for Imagen 3)

1. Go to **Vertex AI** → **Dashboard**
2. Note your **Project ID** → `GOOGLE_CLOUD_PROJECT_ID`
3. Choose a **Location** (e.g., `us-central1`) → `VERTEX_AI_LOCATION`
4. You may need to enable billing for Vertex AI

---

## 3. Vercel Setup

### 3.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your Git repository (or deploy manually)

### 3.2 Configure Environment Variables

Go to **Settings** → **Environment Variables** and add:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
GEMINI_API_KEY=your_gemini_api_key
VERTEX_AI_LOCATION=us-central1
```

### 3.3 Deploy

1. Push your code to Git
2. Vercel will auto-deploy
3. Copy your deployment URL → `VITE_VERCEL_API_URL`

---

## 4. Extension Setup

### 4.1 Install Dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

This installs all required packages (React, Vite, Supabase client, etc.)

### 4.2 Generate Extension Icons

The extension needs PNG icons. Generate them from the included SVG:

1. Open `public/icons/generate-icons.html` in your browser
2. Click **"Download All Icons"**
3. Move the 4 downloaded files (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`) to `public/icons/`

### 4.3 Create Environment File

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_VERCEL_API_URL=https://your-app.vercel.app
```

> **Note:** You can leave `VITE_VERCEL_API_URL` empty initially and add it after deploying to Vercel.

### 4.4 Build the Extension

Run the build command:

```bash
npm run build
```

This creates a `dist/` folder containing your ready-to-load extension.

**Expected output:**
```
✓ built in ~800ms
✓ sidepanel.html moved to dist/
✓ Icons copied to dist/icons/
✓ Manifest copied to dist/
```

### 4.5 Load Extension in Chrome

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `dist` folder from your project

### 4.6 Get Your Extension ID

After loading, Chrome displays your extension with a unique ID:

1. Find your extension card in the list
2. Copy the **ID** (looks like: `abcdefghijklmnopqrstuvwxyz123456`)
3. **Go back and complete Section 2.3** if you skipped it:
   - Add redirect URI to Google Cloud OAuth
   - Add redirect URI to Supabase Auth settings

Format: `https://<YOUR_EXTENSION_ID>.chromiumapp.org/`

### 4.7 Update Manifest with OAuth Client ID

Edit `src/manifest.json` and replace the placeholder:

```json
"oauth2": {
  "client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com",
  "scopes": ["openid", "email", "profile"]
}
```

Then rebuild:

```bash
npm run build
```

Reload the extension in Chrome (click the refresh icon on your extension card).

---

## 5. Final Checklist

- [ ] Supabase project created
- [ ] Database table `closet_items` created with RLS
- [ ] Storage bucket `user_photos` created with RLS
- [ ] Google OAuth enabled in Supabase
- [ ] GCP project created
- [ ] Vertex AI API enabled
- [ ] Generative Language API enabled
- [ ] OAuth 2.0 credentials created
- [ ] Gemini API key created
- [ ] Vercel project deployed
- [ ] Environment variables set in Vercel
- [ ] Extension built and loaded
- [ ] Extension ID added to redirect URLs
- [ ] `.env` file created with all keys

---

## 6. Testing

1. Open the extension side panel
2. Sign in with Google
3. Browse a fashion website (e.g., zara.com)
4. Navigate to a product page
5. Check if items appear in the Closet tab
6. Upload a reference photo in Settings
7. Test the AI recommendation on a product page

---

## Troubleshooting

### OAuth Redirect Error
- Make sure redirect URLs match exactly in Supabase, Google Cloud, and manifest.json
- Extension ID must be consistent

### Supabase RLS Errors
- Verify RLS policies are created correctly
- Check that user is authenticated before queries

### Gemini API Errors
- Verify API key is correct
- Check that Generative Language API is enabled
- Ensure billing is enabled if required

### Vercel Function Timeouts
- Check `vercel.json` has `maxDuration: 60` for AI endpoints
- Monitor function logs in Vercel dashboard

---

## Security Notes

- **Never commit** `.env` file to Git
- **Never expose** `SUPABASE_SERVICE_KEY` in client-side code
- Keep API keys secure and rotate them periodically
- Use environment variables for all sensitive data

---

## Support

If you encounter issues, check:
1. Browser console for errors
2. Vercel function logs
3. Supabase logs
4. Chrome extension service worker logs (`chrome://extensions/` → Details → Inspect views: service worker)
