import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ClosetTab() {
  const { user, supabase, signIn } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [user, supabase]);

  const loadItems = async () => {
    if (!user || !supabase) {
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

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: '200px', marginBottom: '12px' }}></div>
        <div className="skeleton" style={{ height: '200px', marginBottom: '12px' }}></div>
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
        <div key={item.id} className="card" style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: 'var(--space-2)',
          gap: 'var(--space-3)'
        }}>
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
        </div>
      ))}
    </div>
  );
}
