# PRD: dejavistaa (DejaVista — AI Fashion Memory)

## Overview
A Chrome extension that passively tracks clothing items you browse on fashion sites (e.g., Zara, H&M, ASOS), stores them in a Supabase-backed "closet," and uses Google Gemini to suggest a matching piece (plus optional accessories) from that history. Virtual try-on is **prompt-based Gemini image generation** with a simulation fallback (reuse the reference photo). Privacy controls: incognito toggle and memory purge.

## Goals
- Passively track clothing items browsed on supported fashion websites
- Store browsed items in Supabase (`url` + JSON `meta`: title, image, color, price, brand)
- Use Gemini to suggest a primary match (and up to two accessories) from stored closet
- Gemini try-on of the current product on the user's reference photo, with simulation fallback
- Privacy controls: incognito mode and purge memory
- Chrome Extension (Manifest V3) + Vercel serverless `api/ai/*` + static landing page

## Non-Goals
- Actual try-on (AR/ML-based body segmentation)
- Purchase automation
- Multi-browser support (Chrome only)
- Native mobile app

## User Stories
- As a fashion shopper, I want the extension to silently remember items I browse so I can get outfit suggestions later.
- As a user, I want to ask "What matches this jacket?" and get AI recommendations from my closet history.
- As a privacy-conscious user, I want to turn off tracking in incognito mode or delete all my data instantly.

## Tech Stack
- **Runtime**: Chrome Extension (Manifest V3)
- **Language**: JavaScript / React (side panel + content scripts)
- **Build**: Vite (multi-entry `vite.config.js`)
- **AI**: `@google/genai`, `@google/generative-ai`, optional `@google-cloud/vertexai`
- **Database**: Supabase (PostgreSQL + Storage)
- **Auth**: Supabase Auth (Google OAuth via `chrome.identity`)
- **Deployment**: Load local `dist/` in Chrome; Vercel hosts the landing page + `api/ai/*`

## Architecture
```
dejavistaa/
├── index.html            # Popup entry point
├── package.json          # React + Supabase + Google AI deps
├── vite.config.js        # Vite + web-extension plugin config
├── build-wrapper.js      # Custom build orchestrator
├── build-extension.js    # Chrome extension packaging
├── dejavista/            # Core extension source (TypeScript/React)
│   ├── popup/            # Extension popup UI
│   ├── content/          # Content scripts (injected into fashion sites)
│   ├── background/       # Service worker (Manifest V3 background)
│   └── ...
├── api/                  # Vercel serverless API routes
├── database/             # Supabase migrations / schema
└── dist/                 # Built extension (load into Chrome)
```

**Extension components:**
- **Content script**: injected into supported fashion sites; detects product images + metadata; sends to background
- **Background service worker**: receives item data, writes to Supabase
- **Side panel**: React UI showing Mirror (current product + try-on), Memory (closet), Settings (photo / privacy)

**AI flow:**
1. User signs in (Google) and browses a product page; items sync into `closet_items`
2. Side panel Mirror loads closet history and calls `POST /api/ai/recommend` with the session token
3. Gemini returns one primary match + optional accessories from history
4. Try-on calls `POST /api/ai/visualize` (Gemini image model, 40s timeout, simulation fallback)

## Features (detailed)

### Passive Tracking
- Content script detects product page patterns on supported sites
- Extracts: image URL, product name, category, color, price
- Stores via background → Supabase `closet_items` table
- Runs silently (no user interaction required)

### AI Outfit Suggestions
- Current product + closet items sent to Gemini
- Returns: one primary match from history and up to two accessory IDs
- Short stylist reasoning (not a free-text “what matches this?” chat)

### Virtual Try-On
- Uses the user's reference photo + current product image
- Gemini image model composes a try-on photo
- On timeout/failure: same reference photo in placeholder pose slots
- Not true AR — prompt-based generation only

### Privacy Controls
- **Incognito toggle**: disables tracking when enabled
- **Purge Memory**: deletes all Supabase records for the user

## Data / Config (`.env`)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_VERCEL_API_URL=https://dejavistaa.vercel.app
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
GEMINI_API_KEY=xxx
```

## Deployment / Run
```bash
npm install
npm run build
# → Load dist/ into Chrome: chrome://extensions → Developer mode → Load unpacked
```

## Constraints & Notes
- **Manifest V3**: service workers replace persistent background pages; storage APIs limited
- **Supported sites**: content script must explicitly target known fashion site URL patterns
- **GenAI costs**: each outfit suggestion call uses Gemini/Vertex AI tokens — monitor usage
- **Supabase RLS**: Row Level Security should be configured so users only access their own data
- **Virtual try-on**: simulated (prompt-based image generation), not true body-mapped AR
