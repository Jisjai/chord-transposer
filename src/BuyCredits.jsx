// src/BuyCredits.jsx
// ─────────────────────────────────────────────────────────────
// Modal that appears when user hits their daily upload limit.
// Shows two pack options, handles the Stripe checkout redirect.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

const gold   = '#c8a84b';
const bg2    = '#141310';
const bg3    = '#1a1916';
const border = '#2a2820';
const textPrimary = '#e8e0d0';
const textMuted   = '#6b6456';

const PACKS = [
  { id: 'small', credits: 20, price: '€1.99', label: 'Starter',    description: 'Perfect for occasional use' },
  { id: 'large', credits: 50, price: '€3.99', label: 'Pro',        description: 'Best value for regular players' },
];

export default function BuyCredits({ user, onClose }) {
  const [loading, setLoading] = useState(null); // which pack is loading

  const handlePurchase = async (packId) => {
    if (!user) return;
    setLoading(packId);

    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pack: packId,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await res.json();
      if (data.url) {
        // Redirect to Stripe checkout page
        window.location.href = data.url;
      } else {
        alert('Something went wrong. Please try again.');
        setLoading(null);
      }
    } catch (err) {
      alert('Something went wrong. Please try again.');
      setLoading(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 201,
        transform: 'translate(-50%,-50%)',
        background: bg2, border: `1px solid ${border}`, borderRadius: 16,
        padding: '28px', width: 300, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 'normal', color: textPrimary, fontFamily: "Georgia, serif" }}>
              Get more uploads
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: textMuted, fontFamily: 'sans-serif' }}>
              Credits never expire
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: `1px solid ${border}`,
            borderRadius: 6, color: textMuted, padding: '4px 9px',
            cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {/* Daily limit reminder */}
        <div style={{
          background: bg3, border: `1px solid ${border}`, borderRadius: 8,
          padding: '10px 14px', marginBottom: 20, marginTop: 16,
        }}>
          <p style={{ margin: 0, fontSize: 12, color: textMuted, fontFamily: 'sans-serif', lineHeight: 1.5 }}>
            You've used your free uploads for today. Purchase a credit pack to keep going, or come back tomorrow for 5 more free uploads.
          </p>
        </div>

        {/* Pack options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PACKS.map(pack => (
            <button key={pack.id} onClick={() => handlePurchase(pack.id)}
              disabled={!!loading}
              style={{
                background: loading === pack.id ? bg3 : bg3,
                border: `1px solid ${loading === pack.id ? border : '#4a4438'}`,
                borderRadius: 10, padding: '14px 16px', cursor: loading ? 'default' : 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.15s', opacity: loading && loading !== pack.id ? 0.5 : 1,
              }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, color: textPrimary, fontFamily: 'sans-serif', marginBottom: 2 }}>
                  {pack.label} — {pack.credits} uploads
                </div>
                <div style={{ fontSize: 11, color: textMuted, fontFamily: 'sans-serif' }}>
                  {pack.description}
                </div>
              </div>
              <div style={{ fontSize: 16, color: gold, fontFamily: 'sans-serif', fontWeight: 'bold', marginLeft: 12 }}>
                {loading === pack.id ? '...' : pack.price}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <p style={{ margin: '16px 0 0', fontSize: 10, color: '#2a2820', fontFamily: 'sans-serif', textAlign: 'center', letterSpacing: '0.04em' }}>
          Secure payment via Stripe · No subscription
        </p>
      </div>
    </>
  );
}
