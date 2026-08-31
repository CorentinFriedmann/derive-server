// lib/resend.js — thin wrapper around the Resend REST API (one fetch call,
// no SDK needed). Mirrors lib/claude.js: reads its own env var, warns once
// if missing instead of crashing the whole server.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY manquante dans .env — /api/email-itinerary échouera tant qu\'elle n\'est pas définie (compte gratuit sur resend.com).');
}

// onboarding@resend.dev works out of the box with any Resend account, no
// domain verification needed — good enough until a real domain is set up
// and RESEND_FROM is overridden in .env.
const FROM = process.env.RESEND_FROM || 'Peacetrip <onboarding@resend.dev>';

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY manquante');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + RESEND_API_KEY
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html })
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error('Resend API ' + response.status + ': ' + errText.slice(0, 300));
  }
  return response.json();
}

module.exports = { sendEmail };
