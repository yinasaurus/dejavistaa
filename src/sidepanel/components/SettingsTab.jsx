import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function SettingsTab() {
  const { user, supabase, signIn, signOut } = useAuth();
  const { showToast } = useToast();
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadUserPhoto();
  }, [user, supabase]);

  const loadSettings = async () => {
    const result = await chrome.storage.local.get(['incognitoMode']);
    setIncognitoMode(result.incognitoMode || false);
  };

  const loadUserPhoto = async () => {
    if (!user || !supabase) return;

    try {
      const { data } = await supabase.storage
        .from('user_photos')
        .download(`${user.id}/reference.jpg`);

      if (data) {
        const url = URL.createObjectURL(data);
        setPhotoPreview(url);
      }
    } catch (error) {
      // Photo doesn't exist
    }
  };

  const handleIncognitoToggle = async (value) => {
    setIncognitoMode(value);
    await chrome.storage.local.set({ incognitoMode: value });
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user || !supabase) return;

    console.log('[Settings] Starting photo upload...', {
      size: file.size,
      type: file.type,
      name: file.name
    });

    setUploading(true);

    try {
      // 1. Convert file to base64 for validation
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const base64Image = await base64Promise;

      // 2. Validate with AI
      console.log('[Settings] Validating photo with AI...');
      const validateRes = await fetch(`${VERCEL_API_URL}/api/ai/validate-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image })
      });

      if (!validateRes.ok) {
        throw new Error('AI Validation service unavailable');
      }

      const validation = await validateRes.json();
      if (!validation.valid) {
        console.warn('[Settings] Photo rejected by AI:', validation.reasoning);
        showToast(`Rejected: ${validation.reasoning}`, 'error');
        setUploading(false);
        return;
      }

      console.log('[Settings] Photo passed AI validation');

      // Preview
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);

      const path = `${user.id}/reference.jpg`;
      console.log('[Settings] Uploading to path:', path);

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('user_photos')
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '0',
        });

      if (error) {
        console.error('[Settings] Supabase upload error:', error);
        throw error;
      }

      console.log('[Settings] Upload success:', data);
      showToast('Photo verified and uploaded!', 'success');
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast(error.message || 'Failed to upload photo', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handlePurgeMemory = async () => {
    if (!confirm('Are you sure? This will delete all your browsing history and photos.')) {
      return;
    }

    if (!user || !supabase) return;

    try {
      // Delete all closet items
      const { error: itemsError } = await supabase
        .from('closet_items')
        .delete()
        .eq('user_id', user.id);

      if (itemsError) throw itemsError;

      // Delete user photo
      const { error: photoError } = await supabase.storage
        .from('user_photos')
        .remove([`${user.id}/reference.jpg`]);

      if (photoError) {
        console.error('Error removing photo:', photoError);
        // We continue to carry out other cleanups, but let the user know
        showToast('Could not delete photo (check permissions)', 'error');
      }

      // Clear local cache
      await chrome.storage.local.clear();

      // Signal photo purged (for other components like MirrorTab)
      await chrome.storage.local.set({ photoPurged: Date.now() });

      showToast('Memory purged successfully', 'success');
      setPhotoPreview(null);
    } catch (error) {
      console.error('Error purging memory:', error);
      showToast('Failed to purge memory', 'error');
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Account
        </h3>
        {user ? (
          <>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              {user.email}
            </p>
            <button className="btn btn-secondary" onClick={signOut}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              Sign in to sync your wardrobe and preferences.
            </p>
            <button className="btn btn-primary" onClick={signIn} style={{ width: '100%' }}>
              Sign In with Google
            </button>
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Reference Photo
        </h3>

        {/* Only show photo UI if logged in */}
        {!user ? (
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Please sign in to upload a reference photo.
          </p>
        ) : (
          <>
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Your reference"
                className="product-image"
                style={{ marginBottom: '12px', opacity: uploading ? 0.5 : 1 }}
                referrerPolicy="no-referrer"
              />
            )}
            <label
              className={`btn btn-secondary ${uploading ? 'disabled' : ''}`}
              style={{ display: 'block', textAlign: 'center', cursor: uploading ? 'wait' : 'pointer' }}
            >
              {uploading ? 'Uploading...' : (photoPreview ? 'Change Photo' : 'Upload Photo')}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
            {uploading && (
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Privacy
        </h3>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontWeight: 500, marginBottom: '4px' }}>Incognito Mode</p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Pause syncing while browsing
            </p>
          </div>
          <button
            className={`toggle ${incognitoMode ? 'active' : ''}`}
            onClick={() => handleIncognitoToggle(!incognitoMode)}
            type="button"
          >
            <span className="toggle-thumb" />
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Data
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
          Delete all your browsing history and uploaded photos
        </p>
        <button className="btn btn-destructive" onClick={handlePurgeMemory}>
          Purge Memory
        </button>
      </div>
    </div>
  );
}
