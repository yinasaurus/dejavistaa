import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function ClosetTab() {
  const { user, supabase, signIn } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadItems();
  }, [user, supabase]);

  const loadItems = async () => {
    if (!user || !supabase) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('closet_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const openItemUrl = (url) => {
    if (!url) return;
    try {
      if (chrome?.tabs?.update && chrome?.tabs?.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs && tabs[0];
          if (activeTab?.id) {
            chrome.tabs.update(activeTab.id, { url });
          } else {
            chrome.tabs.create({ url });
          }
        });
      } else {
        window.open(url, '_blank');
      }
    } catch (e) {
      console.error('Failed to open item:', e);
    }
  };

  const deleteItem = async (item, event) => {
    event.stopPropagation();
    if (!user || !supabase || !item?.id) return;
    setDeletingId(item.id);
    try {
      const { error } = await supabase
        .from('closet_items')
        .delete()
        .eq('id', item.id)
        .eq('user_id', user.id);
      if (error) throw error;
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      showToast('Removed from memory', 'success');
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast('Could not delete item', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '200px', marginBottom: '12px' }}></div>
        <div className="skeleton" style={{ height: '200px', marginBottom: '12px' }}></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📦</div>
        <h3>Sign in to see Memory</h3>
        <p>Your browsing history is saved to your account.</p>
        <button className="btn btn-primary" onClick={signIn} style={{ marginTop: 12 }}>
          Sign In with Google
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📦</div>
        <h3>Memory Empty</h3>
        <p>Your browsing history and saved items will appear here.</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
    }}>
      {items.map((item) => (
        <div
          key={item.id}
          className="card"
          onClick={() => item.url && openItemUrl(item.url)}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: 'var(--space-2)',
            gap: 'var(--space-3)',
            cursor: item.url ? 'pointer' : 'default',
          }}
        >
          {item.meta?.image && (
            <div style={{ flexShrink: 0 }}>
              <img
                src={item.meta.image}
                alt={item.meta.title || 'Item'}
                style={{
                  width: '60px',
                  height: '60px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)'
                }}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>
          )}
          {item.meta?.title && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{
                fontSize: '13px',
                lineHeight: '1.4',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '4px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {item.meta.title}
              </h4>
              {item.meta.price && (
                <p style={{
                  fontSize: '12px',
                  lineHeight: '1.4',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                }}>
                  {item.meta.price}
                </p>
              )}
            </div>
          )}
          <button
            className="btn btn-secondary"
            disabled={deletingId === item.id}
            onClick={(e) => deleteItem(item, e)}
            style={{ flexShrink: 0, fontSize: 11, padding: '4px 8px' }}
          >
            {deletingId === item.id ? '…' : 'Remove'}
          </button>
        </div>
      ))}
    </div>
  );
}
