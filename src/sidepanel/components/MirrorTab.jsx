import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { VERCEL_API_URL } from '../utils/env';

export default function MirrorTab() {
  const { user, supabase } = useAuth();
  const { showToast } = useToast();

  const [currentItem, setCurrentItem] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);

  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const [poses, setPoses] = useState([]);
  const [selectedPose, setSelectedPose] = useState(null);
  const [accessories, setAccessories] = useState([]);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [tryOnError, setTryOnError] = useState(null);

  useEffect(() => {
    loadCurrentTab();
    loadUserPhoto();
    loadHistory();

    const handleTabUpdated = (tabId, changeInfo, tab) => {
      if (tab.active && changeInfo.status === 'complete') {
        loadCurrentTab();
      }
    };

    const handleTabActivated = () => {
      loadCurrentTab();
    };

    const handleStorageChanged = (changes) => {
      if (changes.currentProduct) {
        loadCurrentTab();
      }
      if (changes.photoPurged) {
        setUserPhoto(null);
        setPoses([]);
        setSelectedPose(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabase]);

  useEffect(() => {
    if (currentItem && historyItems.length > 0) {
      fetchRecommendation();
    } else {
      setRecommendation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem?.url, historyItems.length]);

  const loadCurrentTab = async () => {
    try {
      const { currentProduct } = await chrome.storage.local.get(['currentProduct']);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tab?.url || '';

      if (currentProduct && currentProduct.url === currentUrl) {
        setCurrentItem(currentProduct);
        return;
      }

      if (tab?.id && tab.url && !tab.url.startsWith('chrome://')) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'GET_PRODUCT_METADATA',
          });
          if (response && response.meta && response.meta.title) {
            setCurrentItem({
              url: response.url,
              ...response.meta,
              isFallback: true,
            });
            return;
          }
        } catch (err) {
          if (!err.message?.includes('Could not establish connection')) {
            console.log('[Mirror] Active query failed:', err);
          }
        }
      }

      setCurrentItem(null);
    } catch (error) {
      console.error('[Mirror] Error loading current tab:', error);
    }
  };

  const loadUserPhoto = async () => {
    if (!user || !supabase) return;

    const path = `${user.id}/reference.jpg`;

    try {
      const { data, error } = await supabase.storage.from('user_photos').download(path);

      if (error) {
        console.log('[Mirror] No reference photo yet or download error:', error.message);
        return;
      }

      if (data) {
        const url = URL.createObjectURL(data);
        setUserPhoto(url);
      }
    } catch (error) {
      console.error('[Mirror] Error loading user photo:', error);
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
      console.error('[Mirror] Error loading history:', error);
    }
  };

  const fetchRecommendation = async () => {
    if (!currentItem || !user) return;
    if (!VERCEL_API_URL) {
      console.log('[Mirror] Skipping recommendation: VERCEL_API_URL not configured');
      return;
    }

    setLoadingRecommendation(true);
    setRecommendation(null);

    try {
      const response = await fetch(`${VERCEL_API_URL}/api/ai/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentItem,
          historyItems,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[Mirror] Recommendation API error:', text);
        return;
      }

      const data = await response.json();
      setRecommendation(data);
    } catch (error) {
      console.error('[Mirror] Error getting recommendation:', error);
    } finally {
      setLoadingRecommendation(false);
    }
  };

  const handleTryOn = async () => {
    if (!user || !user.id) {
      setTryOnError('Please sign in to use try-on.');
      return;
    }

    if (!VERCEL_API_URL) {
      setTryOnError('API URL not configured.');
      return;
    }

    setTryOnLoading(true);
    setTryOnError(null);

    try {
      const itemsForLook = [];

      // Always prioritize the item the user is currently viewing for try-on,
      // so the generated image matches the on-page product (e.g. the denim shirt).
      if (currentItem) {
        itemsForLook.push({
          url: currentItem.url || currentItem.image,
          meta: currentItem.meta || {
            title: currentItem.title || 'Current item',
            image: currentItem.image,
            brand: currentItem.brand,
          },
        });
      }

      // Optionally, also include the recommended matched item as an additional garment
      // that Gemini can consider as context/accessory.
      if (recommendation?.matchedItemId) {
        const matched = historyItems.find((item) => item.id === recommendation.matchedItemId);
        if (matched) {
          itemsForLook.push(matched);
        }
      }

      // Normalize all items to ensure they have at least url and meta
      const normalizedItems = itemsForLook.map((item) => {
        // If it's a history item from database, it might have different structure
        if (item.image && !item.url) {
          return {
            url: item.image,
            meta: item.meta || {
              title: item.meta?.title || 'Item',
            },
          };
        }
        // Otherwise use as-is
        return {
          url: item.url || item.image,
          meta: item.meta || {
            title: item.title || 'Item',
          },
        };
      });

      if (normalizedItems.length === 0) {
        setTryOnError('No items available for try-on.');
        setTryOnLoading(false);
        return;
      }

      const requestBody = {
        userId: user.id,
        items: normalizedItems,
      };

      console.log('[Mirror] Sending try-on request:', {
        userId: user.id.substring(0, 8) + '...',
        itemsCount: itemsForLook.length,
        items: itemsForLook.map(i => ({ hasUrl: !!i.url, hasMeta: !!i.meta, title: i.meta?.title || i.title }))
      });

      const response = await fetch(`${VERCEL_API_URL}/api/ai/visualize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Mirror] Visualize API error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to generate try-on image (${response.status})`);
      }

      const data = await response.json();
      const newPoses = data.poses || [];

      setPoses(newPoses);
      setSelectedPose(newPoses[0] || null);

      // Cache latest try-on result so it can be restored when coming
      // back from other tabs (e.g. Memory → Mirror) without re-running.
      try {
        if (user && currentItem && newPoses.length > 0 && chrome?.storage?.local) {
          const cacheKey = `tryon:${user.id}:${currentItem.url || currentItem.image}`;
          chrome.storage.local.set({
            [cacheKey]: {
              poses: newPoses,
              selectedPoseId: newPoses[0]?.id || null,
              savedAt: Date.now(),
            },
          });
        }
      } catch (e) {
        console.warn('[Mirror] Failed to cache try-on poses:', e);
      }

      const accessoriesCandidates = historyItems
        .filter((item) => item.id !== recommendation?.matchedItemId)
        .slice(0, 6);

      setAccessories(accessoriesCandidates);
    } catch (error) {
      console.error('[Mirror] Error generating try-on:', error);
      setTryOnError('Something went wrong while generating your try-on.');
    } finally {
      setTryOnLoading(false);
    }
  };

  const openItemUrl = (url) => {
    if (!url) return;
    try {
      if (chrome?.tabs?.query && chrome?.tabs?.update && chrome?.tabs?.create) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs && tabs[0];
          if (activeTab) {
            chrome.tabs.update(activeTab.id, { url });
          } else {
            chrome.tabs.create({ url });
          }
        });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Restore cached try-on result when returning to Mirror for the same product
  useEffect(() => {
    const restoreCachedTryOn = async () => {
      try {
        if (!user || !currentItem || !chrome?.storage?.local) return;
        const cacheKey = `tryon:${user.id}:${currentItem.url || currentItem.image}`;
        const data = await chrome.storage.local.get(cacheKey);
        const cached = data[cacheKey];
        if (cached?.poses?.length) {
          setPoses(cached.poses);
          const initial =
            cached.poses.find((p) => p.id === cached.selectedPoseId) || cached.poses[0];
          setSelectedPose(initial);
        }
      } catch (e) {
        console.warn('[Mirror] Failed to restore cached try-on poses:', e);
      }
    };

    restoreCachedTryOn();
  }, [user?.id, currentItem?.url, currentItem?.image]);

  if (!currentItem) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛍️</div>
        <h3>Ready to Shop</h3>
        <p>Visit a product page to see AI recommendations.</p>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            marginTop: '8px',
          }}
        >
          Look for the &quot;View Match&quot; button on fashion sites.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Reference photo */}
      <div className="card" style={{ marginBottom: '16px' }}>
        {userPhoto ? (
          <img
            src={userPhoto}
            alt="Your reference"
            className="product-image"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Upload a reference photo in Settings to see try-ons.
            </p>
          </div>
        )}
      </div>

      {/* Currently browsing summary */}
      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {currentItem.image && (
            <img
              src={currentItem.image}
              alt={currentItem.title}
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                objectFit: 'cover',
                flexShrink: 0,
              }}
              referrerPolicy="no-referrer"
            />
          )}
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-primary)',
                fontWeight: 700,
              }}
            >
              Currently Browsing
            </span>
            <h3 style={{ fontSize: 15, lineHeight: 1.4, fontWeight: 600, marginTop: 4 }}>
              {currentItem.title}
            </h3>
            {currentItem.price && (
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 13,
                  marginTop: 2,
                }}
              >
                {currentItem.price}
              </p>
            )}
          </div>
        </div>

        {loadingRecommendation && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        )}

        {recommendation?.reasoning && (
          <div className="ai-reasoning" style={{ marginTop: 16 }}>
            {recommendation.reasoning}
          </div>
        )}

        {userPhoto && (
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 16 }}
            onClick={handleTryOn}
            disabled={tryOnLoading}
          >
            {tryOnLoading ? 'Generating look...' : 'Try On'}
          </button>
        )}
      </div>

      {tryOnError && (
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ color: 'var(--color-danger, #c00)', fontSize: 13 }}>{tryOnError}</p>
        </div>
      )}

      {selectedPose && (
        <div className="card" style={{ marginTop: 16 }}>
          <img
            src={selectedPose.imageUrl}
            alt="AI try-on"
            className="product-image"
            referrerPolicy="no-referrer"
          />

          {poses.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 12,
                overflowX: 'auto',
              }}
            >
              {poses.map((pose) => (
                <img
                  key={pose.id}
                  src={pose.imageUrl}
                  alt={pose.id}
                  onClick={() => setSelectedPose(pose)}
                  style={{
                    width: 48,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border:
                      pose.id === selectedPose.id
                        ? '2px solid var(--color-accent, #4b8df8)'
                        : '1px solid rgba(255,255,255,0.12)',
                    cursor: 'pointer',
                    flex: '0 0 auto',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {accessories.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 14, marginBottom: 8 }}>Complete the look</h4>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {accessories.map((item) => (
              <div
                key={item.id}
                className="card"
                onClick={() => {
                  if (item.url) {
                    openItemUrl(item.url);
                  }
                }}
                style={{
                  minWidth: 120,
                  padding: 8,
                  cursor: item.url ? 'pointer' : 'default',
                }}
              >
                {item.meta?.image && (
                  <img
                    src={item.meta.image}
                    alt={item.meta.title || 'Accessory'}
                    className="product-image"
                    style={{ marginBottom: 4 }}
                    referrerPolicy="no-referrer"
                  />
                )}
                <p
                  style={{
                    fontSize: 12,
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {item.meta?.title || 'Saved item'}
                </p>
                {item.url && (
                  <button
                    className="btn btn-secondary"
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      padding: '4px 8px',
                      width: '100%',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openItemUrl(item.url);
                    }}
                  >
                    View item
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

