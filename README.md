# DejaVista - AI Fashion Memory

Chrome Extension that passively tracks viewed clothing items and uses GenAI to recommend matching outfits from browsing history.

## 🚀 Quick Load (For Testers)

Already have the repo? Just load the extension:

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist` folder

That's it! The extension is ready to use.

---

## Features

- 🎯 **Passive Tracking:** Automatically tracks clothing items you view while browsing
- 🤖 **AI Recommendations:** Uses Gemini to find matching items from your history
- 👔 **Virtual Try-On:** Visualize outfits with Vertex AI Imagen
- 🔒 **Privacy First:** Full control over your data with incognito mode and purge options

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase and Google Cloud credentials
   - **CRITICAL:** Ensure `GOOGLE_CLOUD_PROJECT_ID` and `GEMINI_API_KEY` are set for backend features.
     (See [ENV_SETUP.md](./ENV_SETUP.md) for full list)

3. **Build extension:**
   ```bash
   npm run build
   ```

4. **Load in Chrome:**
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the `dist` folder

## Project Structure

```
├── src/
│   ├── manifest.json          # Chrome extension manifest
│   ├── sidepanel/             # React UI components
│   ├── content/               # Content scripts (gaze tracking)
│   └── background/            # Service worker
├── api/                       # Vercel serverless functions
│   └── ai/
│       ├── recommend.js       # Gemini recommendations
│       └── visualize/         # Imagen visualization
├── database/                  # SQL migrations for Supabase
├── public/                    # Static assets (icons, landing page)
└── .env.example               # Environment variables template
```

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Vercel Serverless Functions
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Auth:** Supabase Auth + Google OAuth
- **AI:** Gemini, Vertex AI Imagen

## Documentation

- [SETUP.md](./SETUP.md) - Full setup guide
- [STYLE.md](./STYLE.md) - Design system
- [BASE.md](./BASE.md) - Architecture overview
- [database/README.md](./database/README.md) - Database setup

## License

MIT License - see [LICENSE](./LICENSE) for details
