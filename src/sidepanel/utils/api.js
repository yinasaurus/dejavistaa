import { VERCEL_API_URL } from './env';

export async function aiFetch(supabase, path, body) {
  if (!VERCEL_API_URL) {
    throw new Error('API URL not configured');
  }
  if (!supabase) {
    throw new Error('Not signed in');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not signed in');
  }

  return fetch(`${VERCEL_API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
}
