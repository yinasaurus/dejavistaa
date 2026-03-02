## Vertex AI auth on Vercel – quick fix

If your AI routes return 500s like `Unable to authenticate your request`, it’s almost always the
`GOOGLE_APPLICATION_CREDENTIALS` format.

### **1. Set the var correctly**

In Vercel → project **Settings → Environment Variables**:

```env
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"..."}
```

- Single‑line JSON, no line breaks.  
- Values come directly from the service-account JSON you downloaded from Google Cloud.

### **2. Check the rest, then redeploy**

Verify these also exist: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`,
`GOOGLE_CLOUD_PROJECT_ID`, optional `VERTEX_AI_LOCATION`.  
Then trigger a new deploy (or **Redeploy** the latest) and test again; see
`api/ai/GOOGLE_AUTH_SETUP.md` for more detailed notes.
