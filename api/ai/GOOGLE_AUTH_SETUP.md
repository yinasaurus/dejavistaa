## Google / Gemini auth

`api/ai/*` uses **Google AI Studio** first (`GEMINI_API_KEY`). Vertex AI is optional.

### Required (Vercel + local `.env`)

```env
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GEMINI_API_KEY=your-google-ai-studio-key
```

Get the Gemini key from https://aistudio.google.com/apikey

### Optional Vertex fallback

Only needed if you want Vertex when the API-key path fails:

```env
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...","client_email":"..."}
VERTEX_AI_LOCATION=us-central1
```

`GOOGLE_APPLICATION_CREDENTIALS` must be **valid JSON on one line**.

### How auth works

1. **Gemini API key** (`GEMINI_API_KEY`) — this is what production uses.
2. **Vertex AI** only if the key path fails *and* service-account JSON is set.

The Chrome extension must also send the user's Supabase access token (`Authorization: Bearer …`). Unsigned calls return 401.
