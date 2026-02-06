// Shared Supabase client instance for sidepanel
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

let supabaseInstance = null;

/**
 * Get the Supabase client instance (singleton pattern)
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export function getSupabase() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Supabase credentials not configured');
        return null;
    }

    if (!supabaseInstance) {
        supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                storage: {
                    getItem: (key) => chrome.storage.local.get([key]).then(result => result[key] || null),
                    setItem: (key, value) => chrome.storage.local.set({ [key]: value }),
                    removeItem: (key) => chrome.storage.local.remove([key]),
                },
            },
        });
    }

    return supabaseInstance;
}

/**
 * Check if Supabase is properly configured
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
    return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export default getSupabase;
