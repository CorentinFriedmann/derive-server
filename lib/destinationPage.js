// lib/destinationPage.js — server-rendered HTML for /destinations/:slug.
// Deliberately NOT the SPA: no <script>, no interactivity. It exists so
// Google (and anyone with JS off) gets real content and real <title>/
// <meta description>/Open Graph tags on first response, not an empty shell
// waiting for client-side JS. The "Générer MON itinéraire" button is the
// only bridge back into the real, interactive generator.

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const LOGO_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M58 6 C 46 10 36 16 30 22 C 26 18 18 14 8 12 C 16 18 22 22 26 26 C 20 27 12 26 4 22 C 12 30 22 34 30 32 C 24 36 16 38 6 36 C 18 40 32 40 42 32 C 50 26 56 16 58 6 Z"/></svg>';

function tierCard(tier) {
  const restaurantNames = (tier.restaurants || []).map(r => (typeof r === 'string' ? r : r.name));
  return '' +
    '<div class="card">' +
      '<div class="card-photo"></div>' +
      '<div class="tier-label"><span>' + escapeHtml(tier.label) + '</span></div>' +
      '<div class="price">' + tier.estimatedTotal + '€ <span>total estimé, 6 nuits · 2 voyageurs</span></div>' +
      '<div class="price-note">Hôtel suggéré : ' + escapeHtml(tier.hotel.name) + ' · ~' + tier.hotel.pricePerNight + '€/nuit</div>' +
      '<div class="block"><div class="block-label">Activités</div><ul>' +
        (tier.activities || []).map(a => '<li><span>' + escapeHtml(a) + '</span></li>').join('') +
      '</ul></div>' +
      '<div class="block"><div class="block-label">Tables suggérées</div><ul>' +
        restaurantNames.map(r => '<li><span>' + escapeHtml(r) + '</span></li>').join('') +
      '</ul></div>' +
    '</div>';
}

function renderDestinationPage(dest, baseUrl) {
  const title = dest.name + (dest.country ? ', ' + dest.country : '') + ' — itinéraire sur mesure | Peacetrip';
  const pageUrl = baseUrl + '/destinations/' + dest.slug;
  const promptParam = encodeURIComponent('Un séjour à ' + dest.name + (dest.country ? ', ' + dest.country : ''));

  return '<!DOCTYPE html>\n' +
'<html lang="fr">\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>' + escapeHtml(title) + '</title>\n' +
'<meta name="description" content="' + escapeHtml(dest.metaDescription) + '">\n' +
'<link rel="canonical" href="' + escapeHtml(pageUrl) + '">\n' +
'<meta property="og:type" content="website">\n' +
'<meta property="og:title" content="' + escapeHtml(title) + '">\n' +
'<meta property="og:description" content="' + escapeHtml(dest.metaDescription) + '">\n' +
'<meta property="og:url" content="' + escapeHtml(pageUrl) + '">\n' +
'<meta name="twitter:card" content="summary">\n' +
'<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,560;0,9..144,680;1,9..144,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">\n' +
'<link rel="stylesheet" href="/styles.css">\n' +
'</head>\n' +
'<body>\n' +
'<nav>\n' +
'  <a href="/" class="logo" style="text-decoration:none;color:inherit;">' + LOGO_SVG + 'Peacetrip</a>\n' +
'  <div class="nav-links">\n' +
'    <a href="/#panel">Composer</a>\n' +
'    <a href="/#saved">Mes voyages</a>\n' +
'    <a href="/#how">Comment ça marche</a>\n' +
'  </div>\n' +
'</nav>\n' +
'<div class="wrap dest-hero">\n' +
'  <div class="eyebrow">Idée de séjour</div>\n' +
'  <h1>' + escapeHtml(dest.name) + (dest.country ? ', ' + escapeHtml(dest.country) : '') + '</h1>\n' +
'  <p class="dest-tagline">' + escapeHtml(dest.tagline) + '</p>\n' +
  dest.description.map(p => '  <p class="dest-desc">' + escapeHtml(p) + '</p>\n').join('') +
'  <div class="dest-cta-row">\n' +
'    <a class="dest-cta" href="/?prompt=' + promptParam + '#panel">Générer MON itinéraire pour ' + escapeHtml(dest.name) + ' →</a>\n' +
'  </div>\n' +
'</div>\n' +
'<div class="wrap" style="padding-bottom:60px;">\n' +
'  <h2 class="dest-tiers-head">Trois façons de vivre ' + escapeHtml(dest.name) + '</h2>\n' +
'  <div class="cards">\n' +
    dest.tiers.map(tierCard).join('\n') +
'  </div>\n' +
'  <p style="margin-top:24px;"><a class="dest-back" href="/">← Décrire mon propre voyage sur Peacetrip</a></p>\n' +
'</div>\n' +
'<footer class="wrap">\n' +
'  <div class="foot-brand">Peacetrip</div>\n' +
'  <div class="foot-note">Itinéraire indicatif — chaque séjour peut être adapté, remodelé et réservé sur le vrai générateur.</div>\n' +
'</footer>\n' +
'</body>\n' +
'</html>\n';
}

module.exports = { renderDestinationPage };
