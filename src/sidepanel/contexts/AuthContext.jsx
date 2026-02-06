import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/env';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
}

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 2. Check Supabase Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        chrome.storage.local.set({
          supabaseSession: session
        });
      } else if (event === 'SIGNED_OUT') {
        // Clear session from storage
        chrome.storage.local.remove('supabaseSession');
      }
    });

    return () => subscription.unsubscribe();
  };

  const signIn = async () => {
    if (!supabase) {
      console.error('[DejaVista] ✗ Supabase not initialized');
      return;
    }

    try {
      const extensionId = chrome.runtime.id;
      const redirectUrl = `https://${extensionId}.chromiumapp.org/`;
      console.log('[DejaVista] Starting OAuth flow...', { redirectUrl });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      // Launch OAuth flow
      chrome.identity.launchWebAuthFlow(
        {
          url: data.url,
          interactive: true,
        },
        async (redirectUrl) => {
          if (chrome.runtime.lastError) {
            console.error('[DejaVista] ✗ OAuth error:', JSON.stringify(chrome.runtime.lastError, null, 2));
            showToast(`Auth failed: ${chrome.runtime.lastError.message}`, 'error');
            return;
          }

          if (!redirectUrl) {
            console.error('[DejaVista] ✗ No redirect URL returned');
            return;
          }

          console.log('[DejaVista] Parsing redirect URL:', redirectUrl);
          const url = new URL(redirectUrl);

          // 1. Check for Authorization Code (PKCE Flow)
          const code = url.searchParams.get('code');
          if (code) {
            console.log('[DejaVista] Found auth code, exchanging for session...');
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);

            if (error) {
              console.error('[DejaVista] ✗ Code exchange error:', error);
              showToast('Auth error: ' + error.message, 'error');
            } else {
              console.log('[DejaVista] ✓ Successfully exchanged code for session:', data.session?.user?.email);
              showToast('Signed in successfully', 'success');
              // Ensure we persist/update state
              setUser(data.session?.user ?? null);
              chrome.storage.local.set({
                supabaseSession: data.session
              });
            }
            return;
          }

          // 2. Check for Direct Tokens (Implicit Flow) - Query Params
          let accessToken = url.searchParams.get('access_token');
          let refreshToken = url.searchParams.get('refresh_token');

          // 3. Fallback: Check hash fragment
          if (!accessToken && url.hash) {
            const hashParams = new URLSearchParams(url.hash.substring(1)); // Remove leading '#'
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
          }

          console.log('[DejaVista] Parsed tokens:', {
            hasCode: !!code,
            hasAccess: !!accessToken,
            hasRefresh: !!refreshToken,
            urlType: url.hash ? 'hash' : 'query'
          });

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('[DejaVista] ✗ Session error:', error);
              showToast('Session error: ' + error.message, 'error');
            } else {
              console.log('[DejaVista] ✓ Successfully signed in:', data.session?.user?.email);

              // CRITICAL: Force state update immediately
              setUser(data.session?.user ?? null);
              chrome.storage.local.set({
                supabaseSession: data.session
              });

              showToast('Signed in successfully', 'success');
            }
          } else {
            console.error('[DejaVista] ✗ No tokens/code in redirect URL:', redirectUrl);
            showToast('Authentication failed: No tokens/code found', 'error');
          }
        }
      );
    } catch (error) {
      console.error('[DejaVista] ✗ Sign in error:', error);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    console.log('[DejaVista] Signing out...');

    // Clear user state immediately for instant UI update
    setUser(null);

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Clear all local storage to reset extension state
    await chrome.storage.local.clear();

    console.log('[DejaVista] ✓ Successfully signed out');
    showToast('Signed out', 'info');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
