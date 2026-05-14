// api/extract.js
// ─────────────────────────────────────────────────────────────
// This is a Vercel serverless function.
// It sits between your React app and Anthropic's API.
//
// WHY THIS EXISTS:
//   Your API key must never be in the frontend code — anyone
//   could open DevTools and steal it. This function runs on
//   Vercel's servers, reads the key from an environment variable
//   (which only you can see), and forwards the request to Anthropic.
//
// HOW IT WORKS:
//   React app  →  POST /api/extract (sends image)
//               →  this function adds your secret key
//               →  forwards to Anthropic
//               →  returns extracted text back to React app
// ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Your API key lives in a Vercel environment variable (set in the dashboard)
  // It is NEVER sent to the browser
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  try {
    // Forward the request body straight to Anthropic
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

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
