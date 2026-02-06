---
description: DejaVista coding conventions and rules for AI agents
---

# DejaVista Coding Conventions

This file defines coding standards that all AI coding agents (Cursor, Antigravity, etc.) must follow.

## Project Information

- **Project Name:** DejaVista
- **Type:** Chrome Extension with React + Vite
- **Backend:** Vercel Serverless Functions
- **Database:** Supabase (PostgreSQL)

## Documentation Rules

> **CRITICAL:** Do NOT create new markdown files. Always update existing documentation:
> - `README.md` - Project overview and quick start
> - `SETUP.md` - Detailed setup instructions
> - `LICENSE` - MIT license

## Naming Conventions

### General
- Use `camelCase` for variables and functions
- Use `PascalCase` for React components and classes
- Use `UPPER_SNAKE_CASE` for constants
- Use `kebab-case` for file names (except components)

### React Components
- Component files: `PascalCase.jsx` (e.g., `MirrorTab.jsx`)
- One component per file
- Export as default

### Data Attributes
- Prefix with `dejavista`: `data-dejavista-*`
- Example: `dataset.dejavistaTracked`

## File Structure

```
src/
├── manifest.json           # Extension config
├── background/             # Service worker
├── content/                # Content scripts
└── sidepanel/              # React UI
    ├── components/         # React components
    ├── contexts/           # React contexts
    └── utils/              # Utilities
```

## Code Style

### JavaScript/JSX
- Use ES modules (`import`/`export`)
- Use `async`/`await` for promises
- Use optional chaining (`?.`)
- Use nullish coalescing (`??`)
- Semicolons required
- Single quotes for strings (except JSX attributes)

### React
- Functional components only (no class components)
- Use hooks for state and effects
- Destructure props
- Keep components focused and small

### CSS
- Use CSS custom properties (variables)
- Prefix with `--color-`, `--space-`, `--duration-`
- Mobile-first responsive design

## Environment Variables

### Client-side (Vite)
Prefix with `VITE_`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_VERCEL_API_URL`

### Server-side (Vercel)
No prefix:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_CLOUD_PROJECT_ID`

## API Conventions

- RESTful endpoints under `/api/`
- Return JSON with consistent structure:
  ```json
  { "data": ..., "error": null }
  { "data": null, "error": "message" }
  ```
- Handle CORS preflight (`OPTIONS`)
- Use proper HTTP status codes

## Chrome Extension

- Manifest V3 only
- Use `chrome.storage.local` for persistence
- Use `chrome.runtime.sendMessage` for communication
- Content scripts are IIFE wrapped

## Security

- Never commit `.env` files
- Never expose service keys in client code
- Use RLS policies in Supabase
- Validate all user input

## Git Conventions

- Commit messages: `type: description`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Keep commits atomic and focused
