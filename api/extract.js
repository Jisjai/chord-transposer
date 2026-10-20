// api/extract.js
// ─────────────────────────────────────────────────────────────
// Vercel serverless function — sends a chord-sheet image to Claude (Anthropic API).
//
// The browser only sends { image: <base64 JPEG> }. Everything else
// (model, prompt, token cap) is fixed here, so this endpoint can't be
// used as a general-purpose proxy for the API key.
//
// Also enforces upload limits:
//   - Not signed in: 2 uploads per day (tracked by IP)
//   - Signed in (free): 5 uploads per day (tracked by user ID)
//   - Signed in with purchased credits: 1 credit per upload past the limit
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const LIMIT_ANONYMOUS = 2;
const LIMIT_SIGNED_IN = 5;

// Override with the CLAUDE_MODEL env var in Vercel to try another model.
// Haiku is Anthropic's cheapest model and reads images well, which is all this needs.
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-5-5';
// A chord sheet is usually ~600 tokens of text; this leaves room for long songs.
const MAX_TOKENS = 3000;

// The app compresses images to ≤1000px JPEG, which is well under this.
const MAX_IMAGE_BASE64_CHARS = 4_000_000; // ≈3 MB image

const EXTRACTION_PROMPT = `You are reading a screenshot of a song with lyrics and chords.
Extract the full content and return it as plain text, following these rules:
1. Preserve the layout exactly: if chords appear above a lyric line, keep them on the line above.
2. Keep the original chord symbols exactly as written (e.g. Am7, F#, Bb/D).
3. Preserve the spacing between chords on chord lines.
4. Do not add, remove, or correct anything. Transcribe what you see.
5. Do not use markdown, headers, or formatting. Plain text only.
6. If you cannot find any chords in the image, respond with exactly: NO_CHORDS_FOUND
Return only the extracted text, nothing else.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });

  // ── Validate input before counting it as an upload ─────────
  const image = req.body?.image;
  if (typeof image !== 'string' || image.length === 0) {
    return res.status(400).json({ error: 'No image provided.' });
  }
  if (image.length > MAX_IMAGE_BASE64_CHARS) {
    return res.status(413).json({ error: 'Image is too large.' });
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
    return res.status(400).json({ error: 'Invalid image data.' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // service role key — never exposed to browser
  );

  // ── Identify the user ──────────────────────────────────────
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) userId = user.id;
  }

  // Vercel sets x-forwarded-for; the first entry is the client IP.
  const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const identifier = userId || ip;
  const limit = userId ? LIMIT_SIGNED_IN : LIMIT_ANONYMOUS;

  // ── Check and update upload count ─────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const countKey = `upload_count:${identifier}:${today}`;

  const { data: countData } = await supabase
    .from('upload_counts')
    .select('count')
    .eq('key', countKey)
    .single();

  const currentCount = countData?.count || 0;

  if (currentCount >= limit) {
    if (!userId) {
      return res.status(429).json({
        error: `Daily limit reached. Sign in and purchase more uploads, or come back tomorrow for ${LIMIT_ANONYMOUS} free uploads.`,
        limit,
        used: currentCount,
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('extra_credits')
      .eq('id', userId)
      .single();
    const extraCredits = profile?.extra_credits || 0;

    if (extraCredits <= 0) {
      return res.status(429).json({
        error: 'Daily limit reached. Purchase more uploads to continue, or come back tomorrow.',
        showBuyCredits: true,
        limit,
        used: currentCount,
      });
    }

    // Spend one credit. The .eq on the old value means two simultaneous
    // requests can't both spend the same credit.
    const { data: spent } = await supabase
      .from('profiles')
      .update({ extra_credits: extraCredits - 1 })
      .eq('id', userId)
      .eq('extra_credits', extraCredits)
      .select('id');
    if (!spent || spent.length === 0) {
      return res.status(409).json({ error: 'Please try again.' });
    }
  }

  // Count every upload, including ones paid for with credits.
  await supabase.from('upload_counts').upsert({
    key: countKey,
    count: currentCount + 1,
    updated_at: new Date().toISOString(),
  });

  // ── Send to Claude (fixed request; only the image comes from the user) ──
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Claude API error:', response.status, data?.error?.type, data?.error?.message);
      return res.status(502).json({ error: 'Could not read the image. Please try again.' });
    }

    // Claude replies with a list of content blocks; we only want the text ones.
    const text = (data.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    if (!text) {
      console.error('Claude returned no text:', data.stop_reason);
      return res.status(502).json({ error: 'Could not read the image. Please try again.' });
    }

    const used = currentCount + 1;
    return res.status(200).json({
      text,
      uploadsUsed: used,
      uploadsLimit: limit,
      uploadsRemaining: Math.max(0, limit - used),
    });

  } catch (err) {
    console.error('Extract failed:', err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

