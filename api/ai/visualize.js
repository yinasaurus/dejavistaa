import { createClient } from '@supabase/supabase-js';

// Simple simulation mode: use Supabase signed URLs and return multiple "poses"
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Expect the user ID (to locate the stored reference photo) and one or more items
  const { userId, items } = req.body;

  console.log('[Visualize] Request received:', {
    hasUserId: !!userId,
    userId: userId ? userId.substring(0, 8) + '...' : 'missing',
    hasItems: !!items,
    itemsLength: items?.length || 0,
    itemsPreview: items?.slice(0, 2).map(i => ({ 
      hasUrl: !!i.url, 
      hasImage: !!i.image,
      hasMeta: !!i.meta, 
      title: i.meta?.title || i.title,
      keys: Object.keys(i || {})
    }))
  });

  // Validate userId
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return res.status(400).json({ 
      error: 'Missing required field: userId (must be a non-empty string)',
      received: { 
        hasUserId: !!userId, 
        userIdType: typeof userId,
        hasItems: !!items, 
        itemsLength: items?.length || 0 
      }
    });
  }

  // Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ 
      error: 'Missing required field: items (must be a non-empty array)',
      received: { 
        hasUserId: true, 
        userId: userId.substring(0, 8) + '...', 
        hasItems: !!items,
        itemsType: Array.isArray(items) ? 'array' : typeof items,
        itemsLength: items?.length || 0 
      }
    });
  }

  try {
    const jobId = `job_${Date.now()}`;

    // We always store the reference photo at `${user.id}/reference.jpg`
    const photoPath = `${userId}/reference.jpg`;

    // Check existence first
    const { data: listData, error: listError } = await supabase.storage
      .from('user_photos')
      .list(userId, {
        limit: 1,
        search: 'reference.jpg',
      });

    if (listError || !listData || listData.length === 0) {
      console.error('[Visualize] Photo not found or Supabase error:', listError);
      return res.status(404).json({ error: 'Reference photo not found in storage' });
    }

    // Generate a signed URL for the reference photo
    console.log('[Visualize] Generating signed URL for simulation');
    const { data: signedData, error: signedError } = await supabase.storage
      .from('user_photos')
      .createSignedUrl(photoPath, 3600); // 1 hour link

    if (signedError) {
      console.error('[Visualize] Signed URL error:', signedError);
      throw signedError;
    }

    console.log('[Visualize] Simulation complete. Signed URL generated.');

    // Fake multiple poses by reusing the same signed URL with different IDs
    const poses = [
      { id: 'front', imageUrl: signedData.signedUrl },
      { id: 'side', imageUrl: signedData.signedUrl },
      { id: 'back', imageUrl: signedData.signedUrl },
    ];

    return res.status(200).json({
      jobId,
      status: 'complete',
      poses,
      message:
        'Simulation mode: using your reference photo with multiple pose slots (same image for now).',
      itemsProcessed: items.map((i) => i.meta?.title || i.title || 'Item'),
    });
  } catch (error) {
    console.error('[Visualize] Fatal error during visualization:', error);
    return res.status(500).json({
      error: 'Failed to generate visualization',
      details: error.message,
    });
  }
}
