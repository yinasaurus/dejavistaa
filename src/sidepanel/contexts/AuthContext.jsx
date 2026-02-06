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
            console.error(
              '[DejaVista] ✗ OAuth error:',
              chrome.runtime.lastError,
              chrome.runtime.lastError?.message
            );
            showToast(
              `Auth failed: ${chrome.runtime.lastError?.message || 'OAuth error'}`,
              'error'
            );
            return;
          }

          if (!redirectUrl) {
            console.error('[DejaVista] ✗ No redirect URL returned');
            showToast('Auth failed: No redirect URL returned', 'error');
            return;
          }

          try {
            const url = new URL(redirectUrl);

            // 1) Preferred: code flow (PKCE)
            const code = url.searchParams.get('code');

            // 2) Fallback: implicit flow (tokens in hash fragment)
            const hash = url.hash?.replace(/^#/, '');
            const hashParams = new URLSearchParams(hash || '');
            const accessTokenFromHash = hashParams.get('access_token');
            const refreshTokenFromHash = hashParams.get('refresh_token');

            if (code) {
              const { data, error } = await supabase.auth.exchangeCodeForSession({
                authCode: code,
              });

              if (error) {
                console.error('[DejaVista] ✗ Session exchange error:', error);
                showToast('Auth error: ' + error.message, 'error');
              } else {
                const session = data.session;
                console.log(
                  '[DejaVista] ✓ Successfully signed in (code flow):',
                  session?.user?.email
                );

                setUser(session?.user ?? null);
                chrome.storage.local.set({
                  supabaseSession: session,
                });

                // Sync session to background script
                chrome.runtime.sendMessage({
                  type: 'SUPABASE_SESSION',
                  session,
                });

                showToast('Signed in successfully', 'success');
              }
              return;
            }

            if (accessTokenFromHash) {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessTokenFromHash,
                // Some implicit flows don't return refresh_token; handle gracefully.
                refresh_token: refreshTokenFromHash ?? '',
              });

              if (error) {
                console.error('[DejaVista] ✗ Session error (implicit flow):', error);
                showToast('Session error: ' + error.message, 'error');
              } else {
                const session = data.session;
                console.log(
                  '[DejaVista] ✓ Successfully signed in (implicit flow):',
                  session?.user?.email
                );

                setUser(session?.user ?? null);
                chrome.storage.local.set({
                  supabaseSession: session,
                });

                // Sync session to background script
                chrome.runtime.sendMessage({
                  type: 'SUPABASE_SESSION',
                  session,
                });

                showToast('Signed in successfully', 'success');
              }
              return;
            }

            console.error(
              '[DejaVista] ✗ No auth code or access token in redirect URL',
              redirectUrl
            );
            showToast('Authentication failed: No tokens/code found', 'error');
          } catch (err) {
            console.error('[DejaVista] ✗ Failed to handle redirect URL:', err, redirectUrl);
            showToast('Authentication failed: Invalid redirect URL', 'error');
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
