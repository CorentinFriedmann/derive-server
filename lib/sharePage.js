// lib/sharePage.js — server-rendered /s/:id, a real permanent link for one
// shared itinerary snapshot. Same philosophy as destinationPage.js:
// deliberately NOT the SPA (no client JS, no tabs) so the link works with
// JS off and gets real Open Graph tags for link previews in chat apps —
// the "Composer le mien" button is the only bridge back into the real,
// interactive generator.

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const LOGO_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M58 6 C 46 10 36 16 30 22 C 26 18 18 14 8 12 C 16 18 22 22 26 26 C 20 27 12 26 4 22 C 12 30 22 34 30 32 C 24 36 16 38 6 36 C 18 40 32 40 42 32 C 50 26 56 16 58 6 Z"/></svg>';

const STRINGS = {
  fr: {
    kicker: 'Itinéraire partagé', nights: 'nuits', traveler: 'voyageur', hotel: 'Hôtel suggéré',
    priceNote: 'Total estimé, vols et hôtel inclus',
    activities: 'Activités', restaurants: 'Tables suggérées', dayByDay: 'Déroulé jour par jour',
    cta: 'Composer mon propre itinéraire →',
    back: '← Décrire mon propre voyage sur Peacetrip',
    footNote: 'Itinéraire indicatif — à confirmer sur chaque plateforme de réservation.',
    notFoundTitle: 'Lien introuvable | Peacetrip',
    notFoundText: "Ce lien n'existe plus ou n'a jamais existé.",
    day: 'Jour'
  },
  en: {
    kicker: 'Shared itinerary', nights: 'nights', traveler: 'traveler', hotel: 'Suggested hotel',
    priceNote: 'Estimated total, flights and hotel included',
    activities: 'Activities', restaurants: 'Suggested restaurants', dayByDay: 'Day-by-day itinerary',
    cta: 'Compose my own itinerary →',
    back: '← Describe my own trip on Peacetrip',
    footNote: 'Indicative itinerary — confirm on each booking platform.',
    notFoundTitle: 'Link not found | Peacetrip',
    notFoundText: "This link doesn't exist (any more, or ever).",
    day: 'Day'
  }
};

const HEAD_COMMON = '<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,560;0,9..144,680;1,9..144,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">\n' +
'<link rel="stylesheet" href="/styles.css">\n';

const NAV = '<nav>\n' +
'  <a href="/" class="logo" style="text-decoration:none;color:inherit;">' + LOGO_SVG + 'Peacetrip</a>\n' +
'  <div class="nav-links">\n' +
'    <a href="/#panel">Composer</a>\n' +
'    <a href="/#how">Comment ça marche</a>\n' +
'    <a href="/#saved">Mes voyages</a>\n' +
'  </div>\n' +
'</nav>\n';

function footer(s) {
  return '<footer class="wrap footer-clean">\n' +
'  <div class="footer-top">\n' +
'    <span class="foot-brand">Peacetrip</span>\n' +
'    <span class="foot-links"><a href="mailto:contact@peacetrip.com">contact@peacetrip.com</a></span>\n' +
'  </div>\n' +
'  <div class="foot-note">' + escapeHtml(s.footNote) + '</div>\n' +
'</footer>\n';
}

function renderNotFound(lang) {
  const s = STRINGS[lang === 'en' ? 'en' : 'fr'];
  return '<!DOCTYPE html>\n<html lang="' + (lang === 'en' ? 'en' : 'fr') + '"><head>' + HEAD_COMMON +
    '<title>' + escapeHtml(s.notFoundTitle) + '</title></head><body>' + NAV +
    '<div class="wrap" style="padding:60px 0;"><h1>' + escapeHtml(s.notFoundTitle.split(' | ')[0]) + '</h1>' +
    '<p>' + escapeHtml(s.notFoundText) + '</p>' +
    '<p><a class="dest-back" href="/">← Peacetrip</a></p></div>' +
    footer(s) + '</body></html>';
}

function renderSharedTripPage(trip, baseUrl, shareId) {
  const lang = trip.lang === 'en' ? 'en' : 'fr';
  const s = STRINGS[lang];
  const { destination, country, tier, nights, travelers, days } = trip;
  const destinationFull = destination + (country ? ', ' + country : '');
  const title = destinationFull + ' — ' + tier.label + ' | Peacetrip';
  const pageUrl = baseUrl + '/s/' + shareId;
  const promptParam = encodeURIComponent((lang === 'en' ? 'A trip to ' : 'Un séjour à ') + destinationFull);
  const metaDescription = destinationFull + ' · ' + tier.label + ' · ' + nights + ' ' + s.nights + ' · ' +
    travelers + ' ' + s.traveler + (travelers > 1 ? 's' : '') + ' · ' + tier.estimatedTotal + '€';

  const restaurantNames = (tier.restaurants || []).map(r => (typeof r === 'string' ? r : r.name));

  const dayByDayHtml = (days && days.length) ? (
    '<div class="wrap" style="padding-bottom:50px;">\n' +
    '  <h2 class="dest-tiers-head">' + escapeHtml(s.dayByDay) + '</h2>\n' +
    days.map(d =>
      '  <div class="wp" style="margin-bottom:22px;"><h4>' + escapeHtml(d.title || (s.day + ' ' + d.day)) + '</h4>' +
      (d.slots || []).map(slot =>
        '<div class="day-slot"><div class="dtime">' + escapeHtml((slot.time || '').toUpperCase()) + '</div><div class="dtext">' + escapeHtml(slot.text || '') + '</div></div>'
      ).join('') +
      '</div>\n'
    ).join('') +
    '</div>\n'
  ) : '';

  return '<!DOCTYPE html>\n' +
'<html lang="' + lang + '">\n' +
'<head>\n' + HEAD_COMMON +
'<title>' + escapeHtml(title) + '</title>\n' +
'<meta name="description" content="' + escapeHtml(metaDescription) + '">\n' +
'<link rel="canonical" href="' + escapeHtml(pageUrl) + '">\n' +
'<meta property="og:type" content="website">\n' +
'<meta property="og:title" content="' + escapeHtml(title) + '">\n' +
'<meta property="og:description" content="' + escapeHtml(metaDescription) + '">\n' +
'<meta property="og:url" content="' + escapeHtml(pageUrl) + '">\n' +
'<meta name="twitter:card" content="summary">\n' +
'</head>\n<body>\n' + NAV +
'<div class="wrap dest-hero">\n' +
'  <div class="eyebrow">' + escapeHtml(s.kicker) + '</div>\n' +
'  <h1>' + escapeHtml(destinationFull) + '</h1>\n' +
'  <p class="dest-tagline">' + escapeHtml(tier.label) + ' · ' + nights + ' ' + escapeHtml(s.nights) + ' · ' + travelers + ' ' + escapeHtml(s.traveler) + (travelers > 1 ? 's' : '') + '</p>\n' +
'</div>\n' +
'<div class="wrap" style="padding-bottom:40px;">\n' +
'  <div class="cards" style="grid-template-columns:1fr;max-width:480px;">\n' +
'    <div class="card">\n' +
'      <div class="tier-label"><span>' + escapeHtml(tier.label) + '</span></div>\n' +
'      <div class="price">' + tier.estimatedTotal + '€ <span>' + escapeHtml(s.priceNote) + '</span></div>\n' +
'      <div class="price-note">' + escapeHtml(s.hotel) + ' : ' + escapeHtml(tier.hotel.name) + ' · ~' + tier.hotel.pricePerNight + '€/' + (lang === 'en' ? 'night' : 'nuit') + '</div>\n' +
'      <div class="block"><div class="block-label">' + escapeHtml(s.activities) + '</div><ul>' +
        (tier.activities || []).map(a => '<li><span>' + escapeHtml(a) + '</span></li>').join('') +
'      </ul></div>\n' +
'      <div class="block"><div class="block-label">' + escapeHtml(s.restaurants) + '</div><ul>' +
        restaurantNames.map(r => '<li><span>' + escapeHtml(r) + '</span></li>').join('') +
'      </ul></div>\n' +
'      <a class="dest-cta" href="/?prompt=' + promptParam + '#panel">' + escapeHtml(s.cta) + '</a>\n' +
'    </div>\n' +
'  </div>\n' +
'</div>\n' +
dayByDayHtml +
'<div class="wrap" style="padding-bottom:40px;">\n' +
'  <p><a class="dest-back" href="/">' + escapeHtml(s.back) + '</a></p>\n' +
'</div>\n' +
footer(s) +
'</body>\n</html>\n';
}

module.exports = { renderSharedTripPage, renderNotFound };
