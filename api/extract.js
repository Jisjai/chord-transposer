// api/extract.js
// ─────────────────────────────────────────────────────────────
// Vercel serverless function — proxies requests to Anthropic.
// Also enforces upload limits:
//   - Not signed in: 2 uploads per day (tracked by IP)
//   - Signed in (free): 5 uploads per day (tracked by user ID)
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const LIMIT_ANONYMOUS = 2;
const LIMIT_SIGNED_IN = 5;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured.' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // service role key — never exposed to browser
  );

  // ── Identify the user ──────────────────────────────────────
  // If a JWT token is sent in the Authorization header, verify it
  // Otherwise treat as anonymous and use IP address as identifier
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) userId = user.id;
  }

  const identifier = userId || req.headers['x-forwarded-for'] || 'unknown';
  const limit = userId ? LIMIT_SIGNED_IN : LIMIT_ANONYMOUS;
  const isUser = !!userId;

  // ── Check and update upload count ─────────────────────────
  const today = new Date().toISOString().split('T')[0]; // "2026-05-18"
  const countKey = `upload_count:${identifier}:${today}`;

  // Get current count from Supabase
  const { data: countData } = await supabase
    .from('upload_counts')
    .select('count')
    .eq('key', countKey)
    .single();

  const currentCount = countData?.count || 0;

  if (currentCount >= limit) {
    return res.status(429).json({
      error: isUser
        ? `Daily limit reached. You've used all ${limit} uploads for today. Come back tomorrow!`
        : `Daily limit reached. Sign in for more uploads (${LIMIT_SIGNED_IN}/day) or come back tomorrow.`,
      limit,
      used: currentCount,
    });
  }

  // Increment the counter
  await supabase.from('upload_counts').upsert({
    key: countKey,
    count: currentCount + 1,
    updated_at: new Date().toISOString(),
  });

  // ── Forward to Anthropic ───────────────────────────────────
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    // Tell the frontend how many uploads are left today
    return res.status(200).json({
      ...data,
      uploadsUsed: currentCount + 1,
      uploadsLimit: limit,
      uploadsRemaining: limit - (currentCount + 1),
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
