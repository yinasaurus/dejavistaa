## Environment variables (short guide)

### **1. Create `.env` in project root**

Either copy an example or create it manually with at least:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_VERCEL_API_URL=https://dejavista.vercel.app  # optional override

# Backend-only (set in Vercel, NOT bundled into the extension)
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
```

### **2. Get Supabase values**

From the Supabase Dashboard → your project → **Settings → API**:
- Project URL → `VITE_SUPABASE_URL`  
- `anon`/public key → `VITE_SUPABASE_ANON_KEY`

### **3. Rebuild + reload**

Env vars are injected at **build time**, so whenever you change `.env`:

```bash
npm run build
```

Then in Chrome, go to `chrome://extensions/` and hit **Reload** on DejaVista.
