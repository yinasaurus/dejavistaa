import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { Buffer } from 'node:buffer';

// Supabase is always used to store / fetch the user's reference photo
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Gemini / Nano Banana image generation (direct, no external try-on API needed)
const geminiApiKey = process.env.GEMINI_API_KEY;
const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

// Optional: third‑party / custom virtual try‑on service
// e.g. your Nanobanana endpoint / key, or any other provider
// Configure in dejavistaa/.env if you want to use an external API instead of Gemini:
//   TRYON_API_URL=https://your-tryon-provider.com/v1/tryon
//   TRYON_API_KEY=sk_...
const tryOnApiUrl = process.env.TRYON_API_URL;
const tryOnApiKey = process.env.TRYON_API_KEY;

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
    itemsPreview: items?.slice(0, 2).map((i) => ({
      hasUrl: !!i.url,
      hasImage: !!i.image,
      hasMeta: !!i.meta,
      title: i.meta?.title || i.title,
      keys: Object.keys(i || {}),
    })),
    hasTryOnApiUrl: !!tryOnApiUrl,
    hasGeminiKey: !!geminiApiKey,
  });

  // Validate userId
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return res.status(400).json({
      error: 'Missing required field: userId (must be a non-empty string)',
      received: {
        hasUserId: !!userId,
        userIdType: typeof userId,
        hasItems: !!items,
        itemsLength: items?.length || 0,
      },
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
        itemsLength: items?.length || 0,
      },
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
    console.log('[Visualize] Generating signed URL for reference photo');
    const { data: signedData, error: signedError } = await supabase.storage
      .from('user_photos')
      .createSignedUrl(photoPath, 3600); // 1 hour link

    if (signedError) {
      console.error('[Visualize] Signed URL error:', signedError);
      throw signedError;
    }

    const referenceImageUrl = signedData.signedUrl;

    // Collect garment image URLs from the items array
    // Prefer explicit image fields over generic page URLs to avoid 403s
    // when sites block direct HTML/product-page fetching.
    const garmentImageUrls = items
      .map((i) => i.meta?.image || i.image || i.url)
      .filter((u) => typeof u === 'string' && /^https?:\/\//.test(u));

    console.log('[Visualize] Normalized garment image URLs:', garmentImageUrls.slice(0, 3));

    if (garmentImageUrls.length === 0) {
      console.warn('[Visualize] No garment image URLs found in items, falling back to simulation mode');
      return runSimulationFallback(res, {
        jobId,
        referenceImageUrl,
        items,
      });
    }

    // If a real try‑on API is configured, call it to generate combined images
    if (tryOnApiUrl && tryOnApiKey) {
      try {
        console.log('[Visualize] Calling external try-on API...', {
          url: tryOnApiUrl,
          garments: garmentImageUrls.length,
        });

        // NOTE: Shape this payload to match your provider's contract.
        // This is a generic example that most REST APIs can adapt to.
        const apiResponse = await fetch(tryOnApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tryOnApiKey}`,
          },
          body: JSON.stringify({
            userId,
            referenceImageUrl,
            garmentImageUrls,
          }),
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text().catch(() => '');
          console.error('[Visualize] Try-on API error:', apiResponse.status, errorText);
          throw new Error(`Try-on API failed with status ${apiResponse.status}`);
        }

        const apiData = await apiResponse.json();

        // Expect either an array of poses or a single image URL from the provider
        let poses = [];
        if (Array.isArray(apiData.poses)) {
          poses = apiData.poses
            .map((p, idx) => ({
              id: p.id || `pose-${idx}`,
              imageUrl: p.imageUrl || p.url,
            }))
            .filter((p) => !!p.imageUrl);
        } else if (apiData.imageUrl || apiData.url) {
          poses = [
            {
              id: 'main',
              imageUrl: apiData.imageUrl || apiData.url,
            },
          ];
        }

        if (!poses.length) {
          console.warn('[Visualize] Try-on API returned no usable poses, falling back to simulation mode');
          return runSimulationFallback(res, {
            jobId,
            referenceImageUrl,
            items,
          });
        }

        console.log('[Visualize] Try-on API succeeded with', poses.length, 'poses');

        return res.status(200).json({
          jobId,
          status: 'complete',
          poses,
          message: 'Virtual try-on generated via external API.',
          itemsProcessed: items.map((i) => i.meta?.title || i.title || 'Item'),
        });
      } catch (apiError) {
        console.error('[Visualize] Fatal error calling try-on API, using simulation fallback:', apiError);
        // Fall through to simulation
        return runSimulationFallback(res, {
          jobId,
          referenceImageUrl,
          items,
        });
      }
    }

    // If no external TRYON_API_URL / TRYON_API_KEY configured, but we *do* have
    // a Gemini image key, call Nano Banana (Gemini image) directly to compose
    // the reference body + garment image into a new try-on image.
    if (geminiApiKey) {
      try {
        console.log('[Visualize] Using Gemini image model for virtual try-on...', {
          model: GEMINI_IMAGE_MODEL,
        });

        const primaryGarmentUrl = garmentImageUrls[0];
        const primaryGarmentTitle =
          items?.[0]?.meta?.title || items?.[0]?.title || 'the current product';

        // Guard against very slow Gemini responses by enforcing our own timeout
        // that is comfortably below the Vercel function timeout limit.
        const MAX_AI_MS = 9000;
        const posesFromGemini = await Promise.race([
          generateTryOnWithGemini({
            referenceImageUrl,
            garmentImageUrl: primaryGarmentUrl,
            garmentTitle: primaryGarmentTitle,
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Gemini image generation exceeded ${MAX_AI_MS}ms timeout`)),
              MAX_AI_MS
            )
          ),
        ]);

        if (Array.isArray(posesFromGemini) && posesFromGemini.length) {
          console.log(
            '[Visualize] Gemini image generation succeeded with',
            posesFromGemini.length,
            'pose(s)'
          );
          return res.status(200).json({
            jobId,
            status: 'complete',
            poses: posesFromGemini,
            message: 'Virtual try-on generated with Gemini image model (Nano Banana).',
            itemsProcessed: items.map((i) => i.meta?.title || i.title || 'Item'),
          });
        }

        console.warn(
          '[Visualize] Gemini image generation returned no poses, falling back to simulation mode'
        );
      } catch (geminiError) {
        console.error(
          '[Visualize] Gemini image generation failed or timed out, falling back to simulation mode:',
          geminiError
        );
      }
    }

    // If neither external API nor Gemini image generation succeeds in time,
    // keep old simulation behaviour so the UI never sees a 5xx/504.
    console.log('[Visualize] No working try-on provider, using simulation mode');
    return runSimulationFallback(res, {
      jobId,
      referenceImageUrl,
      items,
    });
  } catch (error) {
    console.error('[Visualize] Fatal error during visualization:', error);
    return res.status(500).json({
      error: 'Failed to generate visualization',
      details: error.message,
    });
  }
}

/**
 * Legacy / fallback behaviour: reuse the reference photo URL for multiple fake poses.
 * This keeps the UI working even if a real try-on provider is not configured
 * or temporarily failing.
 */
function runSimulationFallback(res, { jobId, referenceImageUrl, items }) {
  console.log('[Visualize] Running simulation fallback');

  const poses = [
    { id: 'front', imageUrl: referenceImageUrl },
    { id: 'side', imageUrl: referenceImageUrl },
    { id: 'back', imageUrl: referenceImageUrl },
  ];

  return res.status(200).json({
    jobId,
    status: 'complete',
    poses,
    message:
      'Simulation mode: using your reference photo with multiple pose slots (same image for now).',
    itemsProcessed: items.map((i) => i.meta?.title || i.title || 'Item'),
  });
}

/**
 * Generate a single try-on image using Gemini Nano Banana image model.
 * Combines the user's reference body photo + one garment image into a new image.
 * Returns an array of pose objects compatible with MirrorTab (id + imageUrl).
 */
async function generateTryOnWithGemini({ referenceImageUrl, garmentImageUrl, garmentTitle }) {
  if (!geminiApiKey) {
    console.warn('[Visualize] generateTryOnWithGemini called without GEMINI_API_KEY');
    return [];
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  // Helper: fetch image from URL and convert to base64 string
  async function fetchAsBase64(url) {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch image (${resp.status}) from ${url}`);
    }
    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  }

  const [referenceBase64, garmentBase64] = await Promise.all([
    fetchAsBase64(referenceImageUrl),
    fetchAsBase64(garmentImageUrl),
  ]);

  const prompt = [
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: referenceBase64,
      },
    },
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: garmentBase64,
      },
    },
    {
      text: `Create a professional e-commerce fashion photo. The second image shows the exact garment: ${garmentTitle}. Put THAT garment (shape, color, fabric) onto the person from the first image.

Rules:
- Do NOT add any new accessories (no hats, bags, jewellery, glasses) that are not present in the first image.
- Keep the person's hairstyle, face, and expression exactly the same.
- Keep the inner layers (t-shirt/hoodie) and trousers in their original colors unless they would be completely hidden by the new garment.
- Replace only the main outerwear/top as needed so the new garment is clearly visible.
- Maintain realistic shadows and lighting so the garment looks naturally worn.

The garment in the final image must clearly match the second image and must not change color or major design details.`,
    },
  ];

  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: prompt,
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '3:4',
        imageSize: '1K',
      },
    },
  });

  const poses = [];

  const candidate = response.candidates?.[0];
  if (!candidate || !candidate.content?.parts) {
    console.warn('[Visualize] Gemini image response missing candidates/parts');
    return poses;
  }

  for (const part of candidate.content.parts) {
    if (part.inlineData && part.inlineData.data) {
      const imageData = part.inlineData.data;
      const dataUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${imageData}`;
      poses.push({
        id: poses.length === 0 ? 'main' : `alt-${poses.length}`,
        imageUrl: dataUrl,
      });
    }
  }

  return poses;
}
