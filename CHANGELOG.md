# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

- Tweak prompts and styling based on user feedback.
- Add support for more e‑commerce sites and color detection patterns.

---

## [0.3.0] – 2026-03-04

### Added
- Real **Gemini / Nano Banana image try‑on** in Mirror, replacing pure simulation.
- **Try-on result caching** in Chrome storage so returning to Mirror restores the last look without re-running.
- **Clickable “Complete the look”** accessories with a clear **“View item”** button that opens the original product page.
- Initial **public documentation** of AI integration and error handling behavior.

### Changed
- Mirror now always uses the **currently viewed product** as the primary garment for try-on.
- Gemini image prompt updated to:
  - Preserve face, hair, expression, and inner layers.
  - Avoid adding new accessories (for example hats) unless they already exist.
  - Keep garment color and major design details faithful to the product image.

### Fixed
- Try-on no longer silently fails with 504 timeouts; it falls back to simulation mode if Gemini is too slow.
- Resolved random 403s from product page URLs by preferring real image URLs over HTML pages.

---

## [0.2.0] – 2026-03-03

### Added
- **Gemini-based recommendations** (`/api/ai/recommend`) using browsing history and the current product.
- **Photo validation** API (`/api/ai/validate-photo`) to check reference photos before upload.
- Initial **troubleshooting** documentation (kept local) for common setup and deployment issues.

### Changed
- Recommendation endpoint now:
  - Tries multiple Gemini text models (`gemini-2.5-flash`, `gemini-flash-latest`) and degrades gracefully on 503 / high demand.
  - Returns a friendly “no recommendation” payload instead of 500 when AI is temporarily unavailable.
- Photo validation soft-fails when Gemini is overloaded, allowing uploads to continue.

### Fixed
- Removed invalid model IDs that were returning 404 from the v1beta API.
- Stabilised environment variable handling between local `.env` and Vercel.

---

## [0.1.0] – 2026-03-02

### Added
- Initial Chrome side panel experience:
  - Mirror tab with **reference photo** and **Currently Browsing** card.
  - History-backed **“Complete the look”** section.
- Supabase integration for:
  - Auth and user sessions.
  - Storing browsing history in `closet_items`.
  - Storing reference photos in `user_photos`.
- Basic product scraping for popular fashion sites (H&M, Uniqlo, Zara, ASOS), including:
  - Title, price, brand, primary image.
  - Color detection where available.

