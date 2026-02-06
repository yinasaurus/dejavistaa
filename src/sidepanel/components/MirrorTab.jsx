import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { VERCEL_API_URL } from '../utils/env';

export default function MirrorTab() {
  const { user, supabase } = useAuth();
  const { showToast } = useToast();
  const [currentItem, setCurrentItem] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);
  const [generatedPhoto, setGeneratedPhoto] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingStep, setLoadingStep] = useState(0);

  // Determine if the current item is a "verified product"
  // Score >= 3 means we found things like Buy buttons, size selectors, materials etc.
  const isProduct = useMemo(() => {
    return currentItem?.intentScore >= 2;
  }, [currentItem]);

  const loadingMessages = [
    "Checking size table exists...",
    "Analyzing 'Add to Cart' button...",
    "Scanning color variations...",
    "Extracting material details...",
    "Consulting your fashion history..."
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    loadCurrentTab();
    loadUserPhoto();
    loadHistory();

    // Listen for tab updates (navigation)
    const handleTabUpdated = (tabId, changeInfo, tab) => {
      if (tab.active && changeInfo.status === 'complete') {
        loadCurrentTab();
      }
    };

    // Listen for tab switching
    const handleTabActivated = () => {
      loadCurrentTab();
    };

    // Listen for storage updates (e.g. from FAB or Settings purge)
    const handleStorageChanged = (changes) => {
      if (changes.currentProduct) {
        loadCurrentTab();
      }
      // Listen for photo purge signal from SettingsTab
      if (changes.photoPurged) {
        console.log('[Mirror] Photo purged, clearing cached photo');
        setUserPhoto(null);
        setGeneratedPhoto(null);
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.storage.onChanged.addListener(handleStorageChanged);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.storage.onChanged.removeListener(handleStorageChanged);
    };
  }, [user, supabase]);

  const loadCurrentTab = async () => {
    try {
      // 1. Try to get rich product data from storage (set by FAB click)
      const { currentProduct } = await chrome.storage.local.get(['currentProduct']);

      // 2. Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tab?.url || '';

      // 3. Match stored product with current URL
      if (currentProduct && currentProduct.url === currentUrl) {
        console.log('[Mirror] Using product from storage:', currentProduct.title);
        setCurrentItem(currentProduct);
        return;
      }

      // 4. Active Detection: Ask the tab for metadata if not in storage or URL changed
      if (tab?.id && tab.url && !tab.url.startsWith('chrome://')) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PRODUCT_METADATA' });
          if (response && response.meta && response.meta.title) {
            console.log('[Mirror] Detected product via active query:', response.meta);
            setCurrentItem({
              url: response.url,
              ...response.meta,
              isFallback: true // Mark as actively detected
            });
            return;
          }
        } catch (err) {
          // Silent fallback for connection errors (common on new tabs/chrome://)
          if (!err.message?.includes('Could not establish connection')) {
            console.log('[Mirror] Active query failed:', err);
          }
        }
      }

      // 5. Fallback: If nothing detected, clear the current item
      // This ensures we don't show "stale" products on non-product pages
      setCurrentItem(null);

    } catch (error) {
      console.error('Error loading current tab:', error);
    }
  };

  const loadUserPhoto = async () => {
    if (!user || !supabase) {
      console.log('[Mirror] Skipping photo load: User or Supabase missing', { user: !!user, supabase: !!supabase });
      return;
    }

    const path = `${user.id}/reference.jpg`;
    console.log('[Mirror] Loading user photo from:', path);

    // 0. Check if file exists first to avoid 400 errors
    try {
      const { data: listData, error: listError } = await supabase.storage
        .from('user_photos')
        .list(user.id, {
          limit: 1,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
          search: 'reference.jpg'
        });

      if (listError) {
        console.log('[Mirror] Error listing photos:', listError);
        // If listing fails, we might as well skip download
        return;
      }

      const fileExists = listData && listData.length > 0 && listData[0].name === 'reference.jpg';
      if (!fileExists) {
        console.log('[Mirror] No reference photo found (clean check).');
        showToast('No reference photo found. Upload one in Settings!', 'warning');
        return;
      }

      // 1. Download if exists
      const { data, error } = await supabase.storage
        .from('user_photos')
        .download(path);

      if (error) {
        // Should not happen if check passed, but handle gracefully
        console.warn('[Mirror] Unexpected download error:', error);
        throw error;
      }

      if (data) {
        console.log('[Mirror] Photo downloaded successfully, size:', data.size);
        const url = URL.createObjectURL(data);
        setUserPhoto(url);
      }
    } catch (error) {
      console.error('[Mirror] Error in photo load process:', error);
      // Silent fail for user
    }
  };

  const loadHistory = async () => {
    if (!user || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setHistoryItems(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const getRecommendation = async () => {
    if (!currentItem || !user) return;

    // Skip if API URL not configured
    if (!VERCEL_API_URL) {
      console.log('[Mirror] Skipping recommendation: VERCEL_API_URL not configured');
      return;
    }

    setLoading(true);
    setLoadingStep(0); // Reset loading step
    console.log('[Mirror] Fetching AI recommendations...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${VERCEL_API_URL}/api/ai/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentItem,
          historyItems,
          userId: user.id,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let details = '';
        try {
          const errData = await response.json();
          details = errData.details || errData.error || '';
        } catch (e) {
          details = await response.text();
        }
        console.error('[Mirror] API Error Details:', details);
        throw new Error(`API returned ${response.status}: ${details}`);
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setRecommendation(data);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[Mirror] Recommendation request timed out');
      } else {
        console.error('[Mirror] Error getting recommendation:', error);
      }
      // Clear recommendation on error
      setRecommendations([]);
      setRecommendation(null);
    } finally {
      setLoading(false);
    }
  };

  // Get recommendations only when product changes or history loads
  useEffect(() => {
    // Only fetch if it's a valid product and we have history
    // crucial: we check currentItem.url to avoid re-running on every object reference change
    if (currentItem && isProduct && historyItems.length > 0) {
      // Small debounce/throttle: only fetch if not already loading
      if (!loading) {
        getRecommendation();
      }
    } else if (currentItem && !isProduct) {
      // Clear recommendations if we've moved to a non-product page
      setRecommendations([]);
      setRecommendation(null);
    }
  }, [currentItem?.url, isProduct, historyItems.length]);

  // Handle Try On button click
  const handleTryOn = async () => {
    if (!currentItem || !currentItem.image || !userPhoto || !user || !VERCEL_API_URL) {
      showToast('Need a product image, reference photo, and API configuration', 'warning');
      return;
    }

    setGenerating(true);
    showToast('Connecting to AI Stylist...', 'info');

    try {
      // 1. Prepare items for the API
      const itemsToVisualize = [
        {
          title: currentItem.title,
          url: currentItem.image,
          meta: { title: currentItem.title, brand: currentItem.brand }
        }
      ];

      // If we have a matched pair, add it too
      if (recommendation?.matchedItemId) {
        const matched = historyItems.find(i => i.id === recommendation.matchedItemId);
        if (matched) {
          itemsToVisualize.push({
            title: matched.meta?.title,
            url: matched.image,
            meta: matched.meta
          });
        }
      }

      // 2. Call backend visualization API
      const response = await fetch(`${VERCEL_API_URL}/api/ai/visualize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhotoUrl: `${user.id}/reference.jpg`, // Pass the path as expected by backend
          items: itemsToVisualize
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || 'Failed to generate try-on');
      }

      const result = await response.json();

      if (result.imageUrl) {
        setGeneratedPhoto(result.imageUrl);
        showToast('Try-on generated!', 'success');
      } else {
        throw new Error('No image URL returned from API');
      }
    } catch (error) {
      console.error('Error generating try-on:', error);
      // More descriptive error for 500s
      const errMsg = error.message?.includes('500')
        ? 'AI Server Error (500). Please check Vercel logs.'
        : error.message;
      showToast(errMsg || 'Failed to generate try-on', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Reset generated photo to go back to reference
  const handleResetPhoto = () => {
    setGeneratedPhoto(null);
  };

  if (!currentItem) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛍️</div>
        <h3>Ready to Shop</h3>
        <p>Visit a product page to see AI recommendations.</p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
          Look for the "View Match" button on fashion sites.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Reference Photo Section - shows generated photo if available */}
      <div className="card" style={{ marginBottom: '16px' }}>
        {generating ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            <p style={{ color: 'var(--color-text-secondary)' }}>Generating your look...</p>
          </div>
        ) : generatedPhoto ? (
          <>
            <img
              src={generatedPhoto}
              alt="Generated try-on"
              className="product-image"
              referrerPolicy="no-referrer"
            />
            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={handleResetPhoto}
            >
              Reset to Reference
            </button>
          </>
        ) : userPhoto ? (
          <img
            src={userPhoto}
            alt="Your reference"
            className="product-image"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Upload a reference photo in Settings
            </p>
          </div>
        )}
      </div>

      {/* Currently Browsing Section */}
      {isProduct && (
        <div className={`card ${recommendation ? 'card-ai' : ''}`}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            {currentItem.image && (
              <img
                src={currentItem.image}
                alt={currentItem.title}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-sm)',
                  objectFit: 'cover',
                  flexShrink: 0
                }}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: 1 }}>
              <span style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-primary)',
                fontWeight: 700
              }}>
                Currently Browsing
              </span>
              <h3 style={{ fontSize: '15px', lineHeight: '1.4', fontWeight: 600 }}>
                {currentItem.title}
              </h3>
              {currentItem.price && (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', lineHeight: '1.4', fontWeight: 400 }}>
                  {currentItem.price}
                </p>
              )}
            </div>
          </div>

          {/* AI Recommendations - (Legacy section removed, logic now centralized) */}
          {recommendation?.matchedItemId && (
            <>
              <div className="ai-reasoning">{recommendation.reasoning}</div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '16px' }}
                onClick={handleTryOn}
                disabled={generating || !userPhoto}
              >
                {generating ? 'Generating...' : 'Try On'}
              </button>
            </>
          )}

          {recommendation && !recommendation.matchedItemId && (
            <div className="ai-reasoning">
              {recommendation.reasoning || 'No matching items found in your browsing history.'}
            </div>
          )}

          {/* Show Try On button even without recommendation */}
          {!recommendation?.matchedItemId && userPhoto && (
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={handleTryOn}
              disabled={generating || !currentItem?.image}
            >
              {generating ? 'Generating...' : (!currentItem?.image ? 'Image Missing' : 'Try On')}
            </button>
          )}
        </div>
      )}

      {/* Recommended from Memory Section */}
      {isProduct && (
        <div style={{ marginTop: '24px' }}>
          {historyItems.length === 0 ? (
            <div className="card" style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--color-border)'
            }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0 }}>
                Your fashion memory is empty. <br />
                Browse more items to see AI styling notes!
              </p>
            </div>
          ) : recommendations.length === 0 && !loading ? (
            <div className="card" style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--color-border)'
            }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0 }}>
                No matches in your memory yet. <br />
                Try browsing other items!
              </p>
            </div>
          ) : recommendations.length > 0 && (
            <div className="card card-ai">
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                {recommendations[0].meta?.image && (
                  <img
                    src={recommendations[0].meta.image}
                    alt={recommendations[0].meta.title}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--color-primary)',
                      fontWeight: 700
                    }}>
                      Recommended Match
                    </span>
                    {!loading && (
                      <button
                        onClick={getRecommendation}
                        className="btn btn-secondary"
                        style={{
                          padding: '2px 6px',
                          fontSize: '9px',
                          height: 'auto',
                          borderRadius: 'var(--radius-sm)',
                          textTransform: 'uppercase'
                        }}
                      >
                        Refresh
                      </button>
                    )}
                  </div>
                  <h3 style={{
                    fontSize: '15px',
                    lineHeight: '1.4',
                    fontWeight: 600,
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {recommendations[0].meta.title}
                  </h3>
                  {recommendations[0].meta.price && (
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: 0 }}>
                      {recommendations[0].meta.price}
                    </p>
                  )}
                </div>
              </div>
              <div className="ai-reasoning" style={{ marginTop: '16px' }}>
                {recommendations[0].reasoning}
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '16px' }}
                onClick={handleTryOn}
                disabled={generating || !userPhoto}
              >
                {generating ? 'Generating...' : 'Try On Match'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

