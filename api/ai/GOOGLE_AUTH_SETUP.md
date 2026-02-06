# Google Cloud Authentication Setup

This document explains how to configure Google Cloud authentication for Vertex AI and the fallback Google AI SDK.

## Environment Variables

### Required for Vertex AI (Service Account)

**`GOOGLE_APPLICATION_CREDENTIALS`** - Service account JSON credentials

**Format Options:**

1. **JSON String (Recommended for Vercel/Serverless):**
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS='{"type":"service_account","project_id":"your-project","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"..."}'
   ```

2. **Escaped JSON String (if Vercel auto-escapes):**
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS="{\"type\":\"service_account\",\"project_id\":\"your-project\",...}"
   ```

3. **File Path (Local development only, not supported in serverless):**
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   ```

**How to get service account credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** → **Service Accounts**
3. Create or select a service account
4. Create a new key (JSON format)
5. Download the JSON file
6. Copy the entire JSON content as a string to your environment variable

### Required for Google AI SDK (Fallback)

**`GEMINI_API_KEY`** - Google AI Studio API key

**Format:**
```bash
GEMINI_API_KEY=your-api-key-here
```

**How to get API key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your environment variable

### Additional Configuration

**`GOOGLE_CLOUD_PROJECT_ID`** - Your Google Cloud project ID
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

**`VERTEX_AI_LOCATION`** - Vertex AI region (optional, defaults to `us-central1`)
```bash
VERTEX_AI_LOCATION=us-central1
```

## Authentication Flow

The system uses a **robust authentication flow with automatic fallback**:

1. **Primary:** Attempts to use Vertex AI with service account credentials
   - Parses `GOOGLE_APPLICATION_CREDENTIALS` (supports multiple formats)
   - Validates credentials structure
   - Initializes Vertex AI client

2. **Fallback:** If Vertex AI fails, automatically falls back to Google AI SDK
   - Uses `GEMINI_API_KEY` for authentication
   - Provides same functionality with API key instead of service account

## Vercel Setup

### Option 1: Using Vercel Dashboard

1. Go to your project → **Settings** → **Environment Variables**
2. Add each variable:
   - `GOOGLE_APPLICATION_CREDENTIALS` (paste entire JSON as string)
   - `GEMINI_API_KEY` (your API key)
   - `GOOGLE_CLOUD_PROJECT_ID` (your project ID)
   - `VERTEX_AI_LOCATION` (optional)

3. **Important:** After adding variables, redeploy your project

### Option 2: Using Vercel CLI

```bash
# Set service account credentials (paste JSON directly)
vercel env add GOOGLE_APPLICATION_CREDENTIALS

# Set API key (fallback)
vercel env add GEMINI_API_KEY

# Set project ID
vercel env add GOOGLE_CLOUD_PROJECT_ID

# Set location (optional)
vercel env add VERTEX_AI_LOCATION

# Redeploy
vercel --prod
```

## Troubleshooting

### Error: "GOOGLE_APPLICATION_CREDENTIALS parsing failed"

**Cause:** JSON string is malformed or escaped incorrectly

**Solution:**
- Ensure the JSON is valid (test with `JSON.parse()`)
- Remove any extra quotes or escaping
- In Vercel, try pasting the raw JSON without quotes

### Error: "Vertex AI initialization failed"

**Cause:** Service account credentials are invalid or missing required permissions

**Solution:**
- Verify the service account has Vertex AI User role
- Check that `project_id` matches `GOOGLE_CLOUD_PROJECT_ID`
- Ensure the private key is complete (includes `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

### Error: "Neither Vertex AI nor Google AI SDK available"

**Cause:** Both authentication methods failed

**Solution:**
- Verify `GEMINI_API_KEY` is set correctly
- Check that `@google/generative-ai` package is installed
- Review function logs for specific error messages

## Testing

After setup, test the authentication:

```bash
# Test Vertex AI (if configured)
curl -X POST https://your-app.vercel.app/api/ai/validate-photo \
  -H "Content-Type: application/json" \
  -d '{"image":"base64-encoded-image"}'
```

Check Vercel function logs to see which authentication method was used:
- `[Validate] Using Vertex AI...` - Service account working
- `[Validate] Using Google AI SDK (fallback)...` - Fallback to API key
