import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

function loadDotEnv() {
  try {
    const text = readFileSync(join(root, '..', '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      if (key && value && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env is optional; production URL is the default.
  }
}

loadDotEnv();

const API_BASE = (
  process.env.VITE_VERCEL_API_URL || 'https://dejavistaa.vercel.app'
).replace(/\/$/, '');

const SILENT_GEMINI_FAILURE = /temporarily unavailable|accepted without automatic validation/i;

// 1x1 JPEG so Gemini vision is actually invoked (garbage base64 500s on image decode).
const TINY_JPEG =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

async function postJson(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json, text };
}

test('recommend: Gemini key works (does not silently degrade)', async (t) => {
  t.timeout = 45_000;
  const { status, json } = await postJson('/api/ai/recommend', {
    currentItem: { title: 'healthcheck tee' },
    historyItems: [],
    userId: 'healthcheck',
  });

  assert.equal(status, 200, `recommend HTTP ${status}: ${JSON.stringify(json)}`);
  assert.ok(json && typeof json === 'object', 'recommend returned JSON');

  const reasoning = String(json.reasoning || '');
  assert.equal(
    SILENT_GEMINI_FAILURE.test(reasoning),
    false,
    `Gemini appears down or the key is bad (silent 200 degrade): ${reasoning}`
  );
  assert.notEqual(
    json.error,
    'GEMINI_API_KEY not configured',
    'GEMINI_API_KEY is missing on Vercel'
  );
});

test('validate-photo: Gemini is reachable (does not auto-accept)', async (t) => {
  t.timeout = 90_000;

  // One retry: Gemini vision 503s get turned into a silent 200 auto-accept.
  let last = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    last = await postJson('/api/ai/validate-photo', { image: TINY_JPEG });
    const details = `${last.json?.error || ''} ${last.json?.details || ''} ${last.json?.reasoning || ''}`;
    if (!SILENT_GEMINI_FAILURE.test(details)) break;
  }

  const details = `${last.json?.error || ''} ${last.json?.details || ''} ${last.json?.reasoning || ''}`;
  assert.notEqual(
    last.json?.error,
    'Gemini API key not configured',
    'GEMINI_API_KEY is missing on Vercel'
  );
  assert.equal(
    SILENT_GEMINI_FAILURE.test(details),
    false,
    `validate-photo silently accepted the photo instead of calling Gemini: ${details}`
  );

  const geminiReached =
    typeof last.json?.valid === 'boolean' ||
    /unable to process input image|GoogleGenerativeAI/i.test(details);
  assert.equal(
    geminiReached,
    true,
    `validate-photo did not reach Gemini (HTTP ${last.status}): ${JSON.stringify(last.json)}`
  );
});

test('visualize: Supabase storage is reachable', async (t) => {
  t.timeout = 30_000;
  const { status, json } = await postJson('/api/ai/visualize', {
    userId: '00000000-0000-0000-0000-000000000000',
    items: [
      {
        url: 'https://example.com/garment.jpg',
        title: 'healthcheck',
      },
    ],
  });

  assert.notEqual(status, 500, `Supabase/visualize outage: ${JSON.stringify(json)}`);
  assert.equal(
    status,
    404,
    `expected 404 (no reference photo) as proof storage is up; got ${status} ${JSON.stringify(json)}`
  );
  assert.match(
    String(json?.error || ''),
    /reference photo not found/i,
    `unexpected visualize error: ${JSON.stringify(json)}`
  );
  assert.equal(
    SILENT_GEMINI_FAILURE.test(String(json?.message || '')),
    false,
    `visualize returned simulation without a reference photo: ${JSON.stringify(json)}`
  );
});
