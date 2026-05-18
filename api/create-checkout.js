// api/create-checkout.js
// ─────────────────────────────────────────────────────────────
// Creates a Stripe checkout session for buying upload credits.
// Called from the frontend when user clicks "Buy more uploads".
// Returns a URL that redirects the user to Stripe's payment page.
// ─────────────────────────────────────────────────────────────

import Stripe from 'stripe';

// Pricing config — edit these to change prices
const PACKS = {
  small: { credits: 20,  amount: 199,  currency: 'eur', label: '20 uploads' },
  large: { credits: 50,  amount: 399,  currency: 'eur', label: '50 uploads' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pack, userId, userEmail } = req.body;
  if (!PACKS[pack]) return res.status(400).json({ error: 'Invalid pack' });
  if (!userId)      return res.status(400).json({ error: 'Must be signed in to purchase' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const selected = PACKS[pack];

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userEmail,
      line_items: [{
        price_data: {
          currency: selected.currency,
          unit_amount: selected.amount,
          product_data: {
            name: `Chord Transposer — ${selected.label}`,
            description: `${selected.credits} extra chord sheet uploads`,
          },
        },
        quantity: 1,
      }],
      // After payment, redirect back to the app
      success_url: `${process.env.APP_URL}?payment=success&credits=${selected.credits}`,
      cancel_url:  `${process.env.APP_URL}?payment=cancelled`,
      // Pass userId and credits in metadata so the webhook can credit the account
      metadata: {
        userId,
        credits: selected.credits,
      },
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
