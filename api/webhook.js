// api/webhook.js
// ─────────────────────────────────────────────────────────────
// Listens for payment confirmation from Stripe.
// When a payment succeeds, adds credits to the user's account
// in Supabase.
//
// WHY A WEBHOOK?
//   We can't trust the frontend to say "payment succeeded" —
//   a user could fake that. Stripe calls this endpoint directly
//   from their servers, and we verify the signature to confirm
//   it's genuinely from Stripe.
// ─────────────────────────────────────────────────────────────

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: { bodyParser: false }, // Stripe needs the raw body to verify signature
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(Buffer.from(data)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe    = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase  = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const rawBody   = await getRawBody(req);
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Only handle successful payments
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, credits } = session.metadata;

    if (!userId || !credits) return res.status(400).json({ error: 'Missing metadata' });

    // Add credits to user's profile
    // First get current credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('extra_credits')
      .eq('id', userId)
      .single();

    const currentCredits = profile?.extra_credits || 0;
    const newCredits = currentCredits + parseInt(credits);

    // Upsert the profile with new credit total
    await supabase.from('profiles').upsert({
      id: userId,
      extra_credits: newCredits,
      updated_at: new Date().toISOString(),
    });

    console.log(`Credited ${credits} uploads to user ${userId}. New total: ${newCredits}`);
  }

  return res.status(200).json({ received: true });
}
