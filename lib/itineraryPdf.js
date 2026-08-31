// lib/itineraryPdf.js — renders one tier as a simple, clean PDF using
// pdfkit. No external assets (no logo image) so it has zero extra
// dependencies beyond pdfkit itself; the "logo" is just styled text.

const PDFDocument = require('pdfkit');

const COLORS = { ink: '#0E2A3D', soft: '#4C6E85', blue: '#1C74D1', green: '#0B7D53', border: '#D9EEFA' };

const STRINGS = {
  fr: {
    total: 'Total estimé', hotel: 'Hôtel', nights: 'nuits', traveler: 'voyageur',
    activities: 'Activités', restaurants: 'Tables suggérées',
    footer: 'Itinéraire indicatif — à confirmer sur chaque plateforme de réservation.',
    perNight: '/nuit'
  },
  en: {
    total: 'Total estimate', hotel: 'Hotel', nights: 'nights', traveler: 'traveler',
    activities: 'Activities', restaurants: 'Suggested restaurants',
    footer: 'Indicative itinerary — confirm on each booking platform.',
    perNight: '/night'
  }
};

// Streams the PDF directly into `res` (or any writable stream) — the
// caller sets the response headers (Content-Type, Content-Disposition)
// before calling this.
function buildItineraryPdf({ destinationFull, tier, nights, travelers, lang }, outputStream) {
  const s = STRINGS[lang === 'en' ? 'en' : 'fr'];
  // Always € regardless of UI language: the system prompt in server.js
  // tells Claude to price everything in euros unconditionally (that line
  // isn't part of langDirective's English override), so an English
  // itinerary's numbers are still euros — showing "$" would relabel the
  // same figure as a different currency, not convert it.
  const money = n => `${n}€`;

  const doc = new PDFDocument({ size: 'A4', margins: { top: 60, bottom: 60, left: 56, right: 56 } });
  doc.pipe(outputStream);

  doc.fillColor(COLORS.blue).fontSize(11).font('Helvetica-Bold')
    .text('PEACETRIP', { characterSpacing: 1.5 });

  doc.moveDown(0.6);
  doc.fillColor(COLORS.ink).fontSize(24).font('Helvetica-Bold')
    .text(destinationFull);

  doc.fillColor(COLORS.soft).fontSize(11).font('Helvetica')
    .text(`${tier.label} · ${nights} ${s.nights} · ${travelers} ${s.traveler}${travelers > 1 ? 's' : ''}`);

  doc.moveDown(1);
  doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor(COLORS.border).stroke();
  doc.moveDown(1);

  doc.fillColor(COLORS.soft).fontSize(9).font('Helvetica').text(s.hotel.toUpperCase(), { characterSpacing: 0.5 });
  doc.fillColor(COLORS.ink).fontSize(13).font('Helvetica-Bold').text(tier.hotel.name);
  doc.fillColor(COLORS.soft).fontSize(10).font('Helvetica').text(`~${money(tier.hotel.pricePerNight)}${s.perNight}`);

  doc.moveDown(1);
  doc.fillColor(COLORS.green).fontSize(20).font('Helvetica-Bold').text(money(tier.estimatedTotal));
  doc.fillColor(COLORS.soft).fontSize(9).font('Helvetica').text(s.total.toUpperCase(), { characterSpacing: 0.5 });

  function renderList(title, items) {
    doc.moveDown(1.2);
    doc.fillColor(COLORS.soft).fontSize(9).font('Helvetica-Bold').text(title.toUpperCase(), { characterSpacing: 0.5 });
    doc.moveDown(0.3);
    doc.fillColor(COLORS.ink).fontSize(11).font('Helvetica');
    (items || []).forEach(item => {
      doc.text('•  ' + item, { indent: 4 });
    });
  }

  renderList(s.activities, tier.activities);
  renderList(s.restaurants, (tier.restaurants || []).map(r => (typeof r === 'string' ? r : r.name)));

  doc.moveDown(2);
  doc.fillColor(COLORS.soft).fontSize(8).font('Helvetica').text(s.footer);

  doc.end();
}

module.exports = { buildItineraryPdf };
