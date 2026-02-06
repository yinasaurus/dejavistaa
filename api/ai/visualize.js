import { createClient } from '@supabase/supabase-js';

// VERSION: 2.2 - Signed URL Stability
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userPhotoUrl, items } = req.body;
  console.log('[Visualize] Request received:', { userPhotoUrl, itemsCount: items?.length });

  if (!userPhotoUrl || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const jobId = `job_${Date.now()}`;

    // 1. Download User Photo (Validation)
    // Robust path extraction that handles query params or full URLs
    let photoPath;
    try {
      const urlObj = new URL(userPhotoUrl);
      // Extract everything after /user_photos/
      // Assuming path format: .../user_photos/USER_ID/FILENAME.jpg
      const pathParts = urlObj.pathname.split('user_photos/');
      if (pathParts.length > 1) {
        photoPath = pathParts[1];
      } else {
        // Fallback for unexpected URL structure, try to grab last 2 segments
        photoPath = userPhotoUrl.split('/').slice(-2).join('/');
      }
      // Decode URI component to handle spaces/special chars
      photoPath = decodeURIComponent(photoPath);
    } catch (e) {
      // Fallback if not a valid URL string
      photoPath = userPhotoUrl.split('/').slice(-2).join('/');
    }
    console.log('[Visualize] Validating existence of:', photoPath);

    // We check existence first
    const { data: listData, error: listError } = await supabase.storage
      .from('user_photos')
      .list(userPhotoUrl.split('/')[0], {
        limit: 1,
        search: 'reference.jpg'
      });

    if (listError || !listData || listData.length === 0) {
      console.error('[Visualize] Photo not found or Supabase error:', listError);
      return res.status(404).json({ error: 'Reference photo not found in storage' });
    }

    // 2. Simulation Logic with Signed URL
    // Private buckets require signed URLs for public viewing.
    console.log('[Visualize] Generating signed URL for simulation');
    const { data: signedData, error: signedError } = await supabase.storage
      .from('user_photos')
      .createSignedUrl(photoPath, 3600); // 1 hour link

    if (signedError) {
      console.error('[Visualize] Signed URL error:', signedError);
      throw signedError;
    }

    console.log('[Visualize] Simulation complete. Signed URL generated.');

    return res.status(200).json({
      jobId,
      status: 'complete',
      imageUrl: signedData.signedUrl,
      version: '2.2',
      message: 'Stylist Vision (Simulation Mode). Signed URL generated for secure preview.',
      itemsProcessed: items.map(i => i.title)
    });

  } catch (error) {
    console.error('[Visualize] Fatal error during visualization:', error);
    return res.status(500).json({
      error: 'Failed to generate visualization',
      details: error.message
    });
  }
}
