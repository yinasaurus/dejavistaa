import { createClient } from '@supabase/supabase-js';

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

/**
 * Require a valid Supabase access token.
 * If expectedUserId is set, it must match the token subject.
 * Sends 401/403 and returns null on failure.
 */
export async function requireUser(req, res, { expectedUserId } = {}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: 'Supabase is not configured on the server' });
    return null;
  }

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Missing auth token' });
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return null;
  }

  if (expectedUserId && user.id !== expectedUserId) {
    res.status(403).json({ error: 'User mismatch' });
    return null;
  }

  return user;
}
