# Fixing Vertex AI Authentication on Vercel

## Problem
The API is returning a 500 error: `Unable to authenticate your request` when trying to use Vertex AI.

## Solution

The issue is with how `GOOGLE_APPLICATION_CREDENTIALS` is formatted in Vercel's environment variables.

### Step 1: Go to Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `dejavista` project
3. Go to **Settings** → **Environment Variables**

### Step 2: Fix GOOGLE_APPLICATION_CREDENTIALS

The `GOOGLE_APPLICATION_CREDENTIALS` variable must be:
- **A single-line JSON string** (no newlines)
- **No spaces around the `=` sign** (Vercel handles this automatically)
- **Valid JSON** (can be minified)

#### Current Format (WRONG):
```
GOOGLE_APPLICATION_CREDENTIALS = { "type": "service_account", 
"project_id": "...", ... }
```

#### Correct Format (RIGHT):
```
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"your-project-id","private_key_id":"your-private-key-id","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@your-project.iam.gserviceaccount.com","client_id":"your-client-id","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
```

**Note:** Replace all placeholder values (`your-project-id`, `YOUR_PRIVATE_KEY_HERE`, etc.) with your actual service account credentials from Google Cloud Console.

### Step 3: Convert Your JSON to Single Line

You can use this command to convert your multi-line JSON to a single line:

**Option A: Using Node.js (recommended)**
```bash
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('.env', 'utf8').match(/GOOGLE_APPLICATION_CREDENTIALS\s*=\s*({[\s\S]*})/)?.[1] || '{}'))))"
```

**Option B: Manual Steps**
1. Copy the entire JSON object from your `.env` file
2. Use an online JSON minifier: https://www.jsonformatter.org/json-minify
3. Paste the minified JSON into Vercel's environment variable

### Step 4: Verify All Required Environment Variables

Make sure these are set in Vercel:

- ✅ `SUPABASE_URL` - Your Supabase project URL
- ✅ `SUPABASE_SERVICE_KEY` - Your Supabase service role key
- ✅ `GEMINI_API_KEY` - Your Google AI Studio API key (fallback)
- ✅ `GOOGLE_CLOUD_PROJECT_ID` - Your Google Cloud project ID
- ✅ `GOOGLE_APPLICATION_CREDENTIALS` - Service account JSON (single line)
- ✅ `VERTEX_AI_LOCATION` - (Optional, defaults to `us-central1`)

### Step 5: Redeploy

After updating environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger a new deployment

### Step 6: Test

After redeployment, try the AI recommendation feature again. The code now has:
- ✅ Better error handling for credential parsing
- ✅ Automatic fallback to Google AI SDK (GEMINI_API_KEY) if Vertex AI fails
- ✅ Improved logging to help debug issues

## Troubleshooting

**Still getting 500 errors?**
1. Check Vercel function logs: **Deployments** → Click deployment → **Functions** tab
2. Look for `[Auth]` or `[Recommend]` log messages
3. Verify the JSON is valid by testing it: `JSON.parse(your_json_string)`

**Using Fallback (Google AI SDK)?**
- If you see `[Recommend] Using Google AI SDK fallback` in logs, Vertex AI auth failed but the API key fallback is working
- This is fine - both methods work, but Vertex AI is preferred for production
