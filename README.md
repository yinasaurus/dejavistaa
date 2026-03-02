## DejaVista - AI Fashion Memory

Chrome extension that remembers what you browse on fashion sites and uses GenAI to suggest matching outfits.

### **Quick use (testers)**

1. Build (once):
   ```bash
   npm install
   npm run build
   ```
2. In Chrome go to `chrome://extensions/` → enable **Developer mode** → **Load unpacked** → select the `dist` folder.

### **Core features**

- **Passive tracking** of clothing items on supported fashion sites  
- **AI recommendations** from your Supabase-backed "closet" history  
- **Virtual try-on** using your uploaded reference photo (backend AI APIs)  
- **Privacy controls**: incognito toggle + one-click "Purge Memory"

### **Required config (summary)**

- Create `.env` in the project root (see `ENV_SETUP.md`):
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Optional: `VITE_VERCEL_API_URL` (defaults to the production URL)
- On Vercel, set backend env vars (see `api/ai/GOOGLE_AUTH_SETUP.md` + `VERCEL_ENV_FIX.md`):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
  - `GEMINI_API_KEY`, `GOOGLE_CLOUD_PROJECT_ID`
  - `GOOGLE_APPLICATION_CREDENTIALS` (single‑line service account JSON), `VERTEX_AI_LOCATION` (optional)

### **Tech stack**

- **Extension UI:** React + Vite + Chrome side panel  
- **Data:** Supabase (Postgres + Storage + Auth)  
- **AI:** Gemini (Google AI Studio) and/or Vertex AI, via Vercel serverless functions

### **License**

MIT – see `LICENSE`.
