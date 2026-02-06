import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// In-memory job store (for MVP - use Redis/Supabase for production)
const jobStore = new Map();

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { jobId } = req.query;

    if (!jobId) {
        return res.status(400).json({ error: 'Missing jobId parameter' });
    }

    try {
        // Check job status
        // In production, this would query a database or Redis
        const job = jobStore.get(jobId);

        if (!job) {
            // For demo purposes, simulate a completed job after some time
            // In production, jobs would be stored persistently by visualize.js
            const jobTimestamp = parseInt(jobId.split('_')[1]) || 0;
            const elapsed = Date.now() - jobTimestamp;

            if (elapsed < 5000) {
                // Still processing (simulate 5 second generation time)
                return res.status(200).json({
                    jobId,
                    status: 'processing',
                    progress: Math.min(90, Math.floor(elapsed / 50)),
                    message: 'Generating visualization...',
                });
            } else {
                // Completed
                return res.status(200).json({
                    jobId,
                    status: 'complete',
                    imageUrl: null, // Would contain the generated image URL
                    message: 'Generation complete. Note: This is a demo response.',
                });
            }
        }

        // Return actual job status if found
        return res.status(200).json({
            jobId,
            status: job.status,
            imageUrl: job.imageUrl || null,
            error: job.error || null,
        });
    } catch (error) {
        console.error('Error checking job status:', error);
        return res.status(500).json({
            error: 'Failed to check job status',
            details: error.message
        });
    }
}

// Export job store for use by visualize.js
export { jobStore };
