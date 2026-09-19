## DejaVista - AI Fashion Memory

Chrome extension that remembers what you browse on fashion sites and uses GenAI to suggest matching outfits.

### **1. Quick use (testers)**

1. From the repo root:
   ```bash
   npm install
   npm run build
   ```
2. In Chrome go to `chrome://extensions/` → enable **Developer mode** → **Load unpacked** → select the `dist` folder.
3. After changing `.env`, rebuild. After pulling API changes, **redeploy Vercel** or the extension still talks to the old production functions.
4. `npm test` checks the live API (unauthenticated calls should 401 once the new code is deployed).

### **2. Core features**

- **Passive tracking** of clothing items on supported fashion sites  
- **AI recommendations** from your Supabase‑backed "closet" history  
- **Virtual try‑on** – Gemini generates a try-on image of the current product on your reference photo. If generation is slow or unavailable, the API falls back to showing that same reference photo in placeholder pose slots. This is prompt-based image generation, not body-mapped AR.  
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
    - `service_role` key → `SUPABASE_SERVICE_KEY` (local `.env` and Vercel only — never prefix with `VITE_`, never commit it).

- **Database tables + RLS**
  - In **SQL editor**, run `database/001_closet_items.sql` (safe to re-run).

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
  - `api/ai/recommend` and `api/ai/validate-photo` use `gemini-flash-latest` (recommend also tries `gemini-2.5-flash` first).  
  - `api/ai/visualize` uses `gemini-3.1-flash-image` (Nano Banana 2) for try-on images.

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
    - `api/ai/recommend` → uses `GEMINI_API_KEY` to pick one matching item from closet history, plus up to two accessories for “Complete the look”.  
    - `api/ai/validate-photo` → checks that the reference photo is a usable full-body shot.  
    - `api/ai/visualize` → Gemini image model composes the stored reference photo + the current garment into a try-on image. The extension sends your Supabase session token; unsigned calls are rejected. On timeout (~40s), missing garment URLs, or Gemini failure, it returns the reference photo reused across pose slots so the UI does not 504. That fallback is not AR and does not map clothes onto a body mesh.

---

### **7. Tech stack**

- **Extension UI:** React + Vite + Chrome side panel  
- **Backend:** Vercel serverless functions (`api/ai/*`)  
- **Data:** Supabase (Postgres + Storage + Auth)  
- **AI:** Google Gemini (`gemini-flash-latest` for text/vision, `gemini-3.1-flash-image` for try-on, optional Vertex AI)

### **8. License**

MIT – see `LICENSE`.
