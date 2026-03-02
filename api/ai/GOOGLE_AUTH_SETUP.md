## Google Cloud / Gemini auth (short guide)

These env vars power the AI routes in `api/ai/*`.

### **Required variables**

Set the following in Vercel **Project → Settings → Environment Variables**:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...

GEMINI_API_KEY=your-google-ai-studio-api-key
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id

# Service account JSON as ONE LINE (no newlines)
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"..."}

# Optional, defaults to us-central1
VERTEX_AI_LOCATION=us-central1
```

### **How auth works**

- **First try:** Vertex AI using `GOOGLE_APPLICATION_CREDENTIALS` + `GOOGLE_CLOUD_PROJECT_ID`  
- **Fallback:** Google AI SDK using `GEMINI_API_KEY` if Vertex fails or creds are missing

### **Quick troubleshooting**

- 500s mentioning auth → check that `GOOGLE_APPLICATION_CREDENTIALS` is **valid JSON on one line**.  
- AI calls silently falling back → see Vercel logs for `[Auth]` / `[Recommend]` messages.  
- If both methods fail you’ll see errors like _“Neither Vertex AI nor Google AI SDK available”_ – re-check all vars above.
