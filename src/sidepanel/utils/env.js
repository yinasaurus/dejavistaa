// Environment variable helper
// In Chrome extensions, we need to handle env vars differently
export function getEnvVar(key) {
  // Try import.meta.env first (Vite)
  // Access via bracket notation to handle dynamic keys
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }

  // Fallback to window (if injected)
  if (typeof window !== 'undefined' && window.__ENV__?.[key]) {
    return window.__ENV__[key];
  }

  return null;
}

// Get environment variables with fallbacks
const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL') || 
                     import.meta.env?.VITE_SUPABASE_URL || 
                     '';
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY') || 
                          import.meta.env?.VITE_SUPABASE_ANON_KEY || 
                          '';
const VERCEL_API_URL = getEnvVar('VITE_VERCEL_API_URL') || 
                       import.meta.env?.VITE_VERCEL_API_URL || 
                       'https://dejavista.vercel.app';

// Log warning if environment variables are missing
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '⚠️ Missing Supabase environment variables!\n' +
    'Please ensure:\n' +
    '  1. A .env file exists in the project root with:\n' +
    '     VITE_SUPABASE_URL=your-supabase-url\n' +
    '     VITE_SUPABASE_ANON_KEY=your-anon-key\n' +
    '  2. Run: npm run build\n' +
    '  3. Reload the extension in Chrome\n' +
    '\n' +
    'Current values:\n' +
    `  VITE_SUPABASE_URL: ${SUPABASE_URL ? '✓ Set' : '✗ Missing'}\n` +
    `  VITE_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}`
  );
}

export { SUPABASE_URL, SUPABASE_ANON_KEY, VERCEL_API_URL };
