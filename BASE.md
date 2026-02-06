# DejaVista - AI Fashion Memory Extension

## Project Overview
Chrome Extension that passively tracks viewed clothing items and uses GenAI to recommend matching outfits from browsing history.

**Core Value:** First AI Stylist that remembers yesterday's browsing to enhance today's shopping.

---

## Tech Stack

### Frontend
- **Framework:** React + Vite
- **Platform:** Chrome Extension (Manifest V3)
- **UI API:** Chrome Side Panel API

### Backend
- **API Layer:** Vercel Serverless Functions (Next.js API Routes)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth + Google OAuth
- **Storage:** Supabase Storage (User photos)

### AI Services
- **Reasoning:** Gemini 3 Pro Preview (`gemini-3-pro-preview`)
- **Image Generation:** Google Vertex AI Imagen 3 (`imagen-3.0-generate-002`)

---

## Database Schema

### Table: `closet_items`
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

### RLS Policies
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

### Storage Bucket: `user_photos`
- **Purpose:** Store single high-res reference photo per user
- **Security:** RLS enabled, user can only access their own photo
- **Path Pattern:** `{user_id}/reference.jpg`

---

## Architecture Flows

### 1. Passive Browsing (Memory Phase)
```
User browses category page
  ↓
IntersectionObserver detects image >2s in viewport
  ↓
Content Script validates (>200px, active tab)
  ↓
Extract highest-res URL from srcset/data-zoom-image
  ↓
Debounce: Queue item (sync after 3 items OR 5s idle)
  ↓
Background Script writes batch to Supabase
```

### 2. Buying Intent Detection (Trigger Phase)
```
User lands on product page
  ↓
Content Script calculates Intent Score:
  - og:type="product" → +5
  - "Add to Cart" button → +2
  - Currency symbol → +1
  - Size selector → +2
  ↓
Score > 3 → Trigger Side Panel pulse/auto-open
```

### 3. AI Recommendation (Match Phase)
```
Side Panel opens
  ↓
Query Supabase: Latest 200 items for user
  ↓
Send to Gemini 3 Pro: Current item + 200 history items
  ↓
Prompt: "Return ONE best matching item ID (JSON only)"
  ↓
Display match with reasoning in Side Panel
```

### 4. Virtual Try-On (Visualization Phase)
```
User clicks "Try On" on recommended match
  ↓
Vercel Function orchestrates:
  - Fetch user reference photo from Supabase Storage
  - Send to Vertex AI Imagen 3
  - Generate composite image (user + outfit)
  ↓
Stream/poll for result (handle >10s timeout)
  ↓
Display photorealistic visualization
```

---

## Chrome Extension Structure

### Manifest V3 Key Components
```json
{
  "manifest_version": 3,
  "permissions": [
    "identity",
    "storage",
    "sidePanel",
    "activeTab"
  ],
  "host_permissions": [
    "https://*/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }],
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

### File Structure
```
dejavista/
├── src/
│   ├── manifest.json         # Extension config
│   ├── content/              # Content scripts
│   │   ├── gaze-tracker.js   # Passive image tracking
│   │   └── intent-scorer.js  # Buying intent detection
│   ├── background/           # Service worker
│   │   └── background.js     # Sync manager
│   └── sidepanel/            # React UI
│       ├── App.jsx
│       ├── components/       # MirrorTab, ClosetTab, SettingsTab, etc.
│       ├── contexts/         # AuthContext
│       └── utils/            # env.js, supabase.js
├── api/                      # Vercel serverless functions
│   └── ai/
│       ├── recommend.js      # Gemini orchestration
│       ├── visualize.js      # Imagen generation
│       └── visualize/
│           └── [jobId].js    # Job status polling
├── public/
│   └── icons/                # Extension icons
├── dist/                     # Built extension (load this in Chrome)
└── .env.example              # Environment template
```

---

## Authentication Flow

### Chrome Identity + Supabase
```javascript
// Step 1: Launch OAuth flow
chrome.identity.launchWebAuthFlow({
  url: supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `https://${chrome.runtime.id}.chromiumapp.org/`
    }
  }),
  interactive: true
}, (redirectUrl) => {
  // Step 2: Extract tokens from redirect
  // Step 3: Set session in Supabase client
});
```

**Critical:** Redirect URI must match exactly in:
1. Google Cloud Console OAuth credentials
2. Supabase Auth Settings → Redirect URLs

---

## Performance Optimization

### Latest 200 Context Window
- **Problem:** Querying 10,000+ items is slow
- **Solution:** Only analyze recent 200 items (current shopping session)
- **Implementation:** `ORDER BY created_at DESC LIMIT 200` in SQL query

### Debounced Database Writes
- **Problem:** Too many writes during rapid browsing
- **Solution:** Batch writes (trigger after 3 items OR 5s idle)
- **Location:** Content Script (not Service Worker to avoid sleep issues)

### Optimistic UI
- **Problem:** Gemini 3 reasoning takes 3-5s
- **Solution:** Show skeleton loader immediately, update on response
- **Prompt Optimization:** Request "JSON only" output to reduce token generation

### Vercel Timeout Handling
- **Problem:** Imagen 3 generation exceeds 10s default timeout
- **Solution:** 
  - Set `maxDuration: 60` in `vercel.json`
  - Implement polling from client-side
  - Return job ID immediately, poll for completion

---

## Critical Implementation Notes

### Image Hotlink Protection
**Issue:** E-commerce sites block external referrers (403 errors)  
**Fix:** Add `referrerPolicy="no-referrer"` to all `<img>` tags in React components

### Service Worker Persistence
**Issue:** Background script dies during debounce wait  
**Fix:** Keep debounce timer in Content Script, only message Background when ready to write

### High-Resolution Image Extraction
**Priority Order:**
1. `data-zoom-image` attribute
2. `srcset` attribute (parse for largest dimension)
3. `src` attribute (fallback)

### Privacy Controls
- **Incognito Toggle:** Pauses Supabase sync entirely
- **Purge Memory:** Deletes all `closet_items` + user photo
- **RLS:** Users cannot access other users' data

---

## API Endpoints

### Vercel Serverless Functions

#### POST `/api/ai/recommend`
**Input:**
```json
{
  "currentItem": { "url": "...", "meta": {} },
  "historyItems": [ /* 200 items */ ],
  "userId": "uuid"
}
```
**Output:**
```json
{
  "matchedItemId": "uuid",
  "reasoning": "Both items feature minimalist design..."
}
```

#### POST `/api/ai/visualize`
**Input:**
```json
{
  "userPhotoUrl": "supabase-storage-url",
  "items": [
    { "url": "jacket.jpg" },
    { "url": "jeans.jpg" }
  ]
}
```
**Output:**
```json
{
  "jobId": "xyz",
  "status": "processing"
}
```

#### GET `/api/ai/visualize/:jobId`
**Output:**
```json
{
  "status": "complete",
  "imageUrl": "generated-composite.jpg"
}
```

---

## Environment Variables

### Extension
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VERCEL_API_URL=
```

### Vercel Functions
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
GOOGLE_CLOUD_PROJECT_ID=
GEMINI_API_KEY=
VERTEX_AI_LOCATION=
```