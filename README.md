## DejaVista - AI Fashion Memory

Chrome extension that remembers what you browse on fashion sites and uses GenAI to suggest matching outfits.

### **1. Quick use (testers)**

1. From the repo root:
   ```bash
   npm install
   npm run build
   ```
2. In Chrome go to `chrome://extensions/` → enable **Developer mode** → **Load unpacked** → select the `dist` folder.

### **2. Core features**

- **Passive tracking** of clothing items on supported fashion sites  
- **AI recommendations** from your Supabase‑backed "closet" history  
- **Virtual try‑on (simulated)** – currently reuses your reference photo in different “poses”  
- **Privacy controls**: incognito toggle + one‑click "Purge Memory"

---

### **3. Local `.env` (Vite + Supabase)**

Create a `.env` file in the project root (`dejavistaa/.env`):

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Optional override for the deployed API URL (defaults to production)
VITE_VERCEL_API_URL=https://dejavistaa.vercel.app
```

Then rebuild any time you change `.env`:

```bash
npm run build
```

---

### **4. Supabase setup (DB, storage, auth)**

- **Project & keys**
  - Create a Supabase project.
  - In **Settings → API** copy:
    - Project URL → `VITE_SUPABASE_URL` and `SUPABASE_URL`
    - `anon` key → `VITE_SUPABASE_ANON_KEY`
    - `service_role` key → `SUPABASE_SERVICE_KEY` (backend only, never in `.env`).

- **Database tables + RLS**
  - In **SQL editor**, run `database/001_closet_items.sql` once per project.

- **Storage for reference photos**
  - In **Storage** create a private bucket named `user_photos` with RLS enabled.
  - Then run `database/002_storage_policies.sql` in the SQL editor.

- **Google auth (Supabase provider)**
  - In Google Cloud Console create a **Web application** OAuth client with redirect:  
    `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
  - In Supabase → **Auth → Providers → Google**, paste the client ID/secret and enable Google.
  - In Supabase → **Auth → URL Configuration → Additional Redirect URLs** add:  
    `https://<YOUR_EXTENSION_ID>.chromiumapp.org/`

---

### **5. Vercel backend setup (env vars)**

In the Vercel project that serves `https://dejavistaa.vercel.app`, under **Settings → Environment Variables** (Production):

- **Supabase (server)**  
  - `SUPABASE_URL = https://YOUR-PROJECT.supabase.co`  
  - `SUPABASE_SERVICE_KEY = YOUR_SERVICE_ROLE_KEY`

- **Gemini / Google AI (API‑key path)**  
  - `GEMINI_API_KEY = <key from https://aistudio.google.com>`  
  - The recommendation and photo‑validation routes use model `gemini-flash-latest`.

- **Optional Vertex AI (service‑account path)**  
  - `GOOGLE_CLOUD_PROJECT_ID = your‑gcp‑project‑id`  
  - `GOOGLE_APPLICATION_CREDENTIALS = { ...service account JSON on ONE line... }`  
  - `VERTEX_AI_LOCATION = us-central1` (or your region)  

After changing env vars, redeploy the latest Production build in Vercel.

---

### **6. How the pieces fit together**

- Extension UI (side panel) talks to:
  - **Supabase** for auth, history (`closet_items`), and `user_photos/<userId>/reference.jpg`.
  - **Vercel APIs**:
    - `api/ai/recommend` → uses `GEMINI_API_KEY` with `gemini-flash-latest` to pick one matching item from history.  
    - `api/ai/validate-photo` → checks your reference photo quality using the same API key.  
    - `api/ai/visualize` → currently returns simulated poses using your stored reference photo.

---

### **7. Tech stack**

- **Extension UI:** React + Vite + Chrome side panel  
- **Backend:** Vercel serverless functions (`api/ai/*`)  
- **Data:** Supabase (Postgres + Storage + Auth)  
- **AI:** Google Gemini (`gemini-flash-latest`, optional Vertex AI)

### **8. License**

MIT – see `LICENSE`.
