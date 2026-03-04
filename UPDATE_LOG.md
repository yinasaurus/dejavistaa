## DejaVista Local Update Log

> This file is for **personal notes only** and is `.gitignore`d so it won’t be pushed to GitHub.

### 2026-03-03

- Wired **Gemini / Nano Banana** into `api/ai/visualize` for real try-on images (instead of pure simulation).
- Added robust error handling and fallbacks:
  - Recommendation API now tries multiple Gemini text models and degrades gracefully on 503/high-demand.
  - Validate-photo auto-accepts images when Gemini is temporarily unavailable.
  - Visualize uses a manual timeout and falls back to simulation mode instead of timing out with 504.
- Improved try-on UX:
  - Always uses the **current product** as primary garment.
  - Prompt tuned so AI changes only the main garment (no random hats / recolors).
  - Caches try-on poses in `chrome.storage.local` and restores them when returning to Mirror.
- Improved “Complete the look”:
  - Accessory cards are clickable and open the original product in the browser.
  - Added a clear **“View item”** button on each accessory.
- Scraper improvements:
  - Normalizes product titles and appends detected color (supports H&M, Uniqlo, Zara, ASOS + generic fallback).

