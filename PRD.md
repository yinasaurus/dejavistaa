# PRD: dejavistaa (DejaVista — AI Fashion Memory)

## Overview
A Chrome extension that passively tracks clothing items you browse on fashion sites (e.g., Zara, H&M, ASOS), stores them in a Supabase-backed "closet," and uses Google GenAI (Vertex AI, Gemini) to suggest matching outfit combinations. Includes a simulated virtual try-on feature. Privacy controls: incognito toggle and one-click memory purge.

## Goals
- Passively track clothing items browsed on supported fashion websites
- Store browsed items in Supabase (image URL, category, color, price, source)
- Use GenAI to suggest outfit combinations from stored closet
- Simulate virtual try-on by overlaying reference photo in different poses
- Privacy controls: incognito mode and purge memory
- Chrome Extension (Manifest V3) + optional web companion (Vite SPA)

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
- **Language**: TypeScript / React (popup + content scripts)
- **Build**: Vite + `vite-plugin-web-extension`
- **AI**: `@google/genai`, `@google/generative-ai`, `@google-cloud/vertexai`
- **Database**: Supabase (PostgreSQL + Storage)
- **Auth**: Supabase Auth
- **Deployment**: Chrome extension (local `dist/`) + optional Vercel for web companion

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
- **Popup**: React UI showing closet, AI suggestions, try-on, privacy controls

**AI flow:**
1. User opens popup → clicks "Get Outfit Suggestions"
2. Popup calls Supabase to fetch closet items
3. Calls Google GenAI with item metadata + user query
4. Returns outfit combination suggestions as text + image references

## Features (detailed)

### Passive Tracking
- Content script detects product page patterns on supported sites
- Extracts: image URL, product name, category, color, price
- Stores via background → Supabase `closet_items` table
- Runs silently (no user interaction required)

### AI Outfit Suggestions
- User query + closet items sent to Gemini/Vertex AI
- Returns: suggested outfits (combinations of closet items)
- May include style tips or occasion matching

### Virtual Try-On (Simulated)
- Uses user's reference photo
- GenAI generates or composites image with selected outfit
- Not true AR — described as "simulated"

### Privacy Controls
- **Incognito toggle**: disables tracking when enabled
- **Purge Memory**: deletes all Supabase records for the user

## Data / Config (`.env`)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_GOOGLE_AI_API_KEY=xxx   # or Vertex AI credentials
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
