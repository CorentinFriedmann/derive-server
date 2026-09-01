// lib/itineraryPdf.js — renders one tier as a pdfkit PDF, styled to match
// the validated apercu-pdf.jpg mockup (navy/green hero, cream price band).
// Kept bilingual (STRINGS below) so English itineraries still get English
// section labels — the mockup itself was French-only, but the app already
// threads `lang` through every export, so labels follow it here too.

const PDFDocument = require('pdfkit');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', 'public', 'assets', 'logo.png');

const NAVY = '#0A2E3D';
const NAVY_LIGHT = '#0F4257';
const GREEN = '#2E9E6B';
const CREAM = '#EAF8F1';
const TEXT_GREY = '#4C7A63';
const FOOTER_GREY = '#8AA69A';
const INK = '#222222';
const RULE = '#EFEFEF';

const STRINGS = {
  fr: {
    kicker: 'VOTRE ITINÉRAIRE',
    formula: 'Formule', nights: 'nuits', traveler: 'voyageur', hotel: 'Hôtel',
    priceNote: 'Total estimé, vols et hôtel inclus',
    activities: 'Activités', restaurants: 'Tables suggérées', dayByDay: 'Déroulé jour par jour',
    footerTagline: 'Peacetrip — Décrivez votre envie, on trace le voyage. — peacetrip.com — contact@peacetrip.com',
    footerLegal: 'Prix estimé à titre indicatif, à confirmer sur chaque plateforme de réservation. Peacetrip, entreprise individuelle — Corentin Friedmann.'
  },
  en: {
    kicker: 'YOUR ITINERARY',
    formula: '', nights: 'nights', traveler: 'traveler', hotel: 'Hotel',
    priceNote: 'Estimated total, flights and hotel included',
    activities: 'Activities', restaurants: 'Suggested restaurants', dayByDay: 'Day-by-day itinerary',
    footerTagline: 'Peacetrip — Describe what you want, we trace the trip. — peacetrip.com — contact@peacetrip.com',
    footerLegal: 'Estimated price, to be confirmed on each booking platform. Peacetrip, sole proprietorship — Corentin Friedmann.'
  }
};

// Streams the PDF directly into `outputStream` — the caller (server.js)
// sets the response headers (Content-Type, Content-Disposition, including
// the accent-safe filename) before calling this, same convention as before.
function buildItineraryPdf({ destination, country, tier, nights, travelers, days, lang }, outputStream) {
  const s = STRINGS[lang === 'en' ? 'en' : 'fr'];
  // Always € — see money() note this file used to carry: the system prompt
  // prices everything in EUR unconditionally regardless of UI language.
  const money = n => `${n}€`;

  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  doc.pipe(outputStream);

  const pageWidth = doc.page.width; // 595.28 for A4
  const pageHeight = doc.page.height;
  const marginX = 50;

  // --- Logo band ---
  doc.rect(0, 0, pageWidth, 70).fill(NAVY);
  try {
    doc.image(LOGO_PATH, marginX, 20, { height: 30 });
  } catch (_e) { /* logo asset missing — PDF still renders fine without it */ }

  // --- Hero band ---
  doc.rect(0, 70, pageWidth, 110).fill(NAVY_LIGHT);
  doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9)
    .text(s.kicker, marginX, 92, { characterSpacing: 1 });
  doc.fillColor(CREAM).font('Times-Bold').fontSize(26)
    .text(country ? `${destination}, ${country}` : destination, marginX, 108, { width: pageWidth - marginX * 2 });
  const metaLine = lang === 'en'
    ? `${tier.label} plan · ${nights} ${s.nights} · ${travelers} ${s.traveler}${travelers > 1 ? 's' : ''} · ${s.hotel}: ${tier.hotel.name}`
    : `${s.formula} ${tier.label} · ${nights} ${s.nights} · ${travelers} ${s.traveler}${travelers > 1 ? 's' : ''} · ${s.hotel} : ${tier.hotel.name}`;
  doc.fillColor('#8FC4D6').font('Helvetica').fontSize(11)
    .text(metaLine, marginX, 150, { width: pageWidth - marginX * 2 });

  // --- Price band ---
  doc.rect(0, 180, pageWidth, 60).fill(CREAM);
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(24)
    .text(money(tier.estimatedTotal), marginX, 198, { continued: true });
  doc.fillColor(TEXT_GREY).font('Helvetica').fontSize(9)
    .text('  ' + s.priceNote, { baseline: 'bottom' });

  // --- Body ---
  let y = 270;
  const ensureRoom = (needed) => {
    if (y + needed > pageHeight - 70) { doc.addPage(); y = 50; }
  };
  const sectionTitle = (title) => {
    ensureRoom(34);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(11)
      .text(title.toUpperCase(), marginX, y, { characterSpacing: 0.5 });
    y += 16;
    doc.strokeColor(GREEN).lineWidth(1.5)
      .moveTo(marginX, y).lineTo(pageWidth - marginX, y).stroke();
    y += 10;
  };
  const textWidth = pageWidth - marginX * 2;
  // Fixed per-line advances only work for text guaranteed to stay on one
  // line — activity/restaurant names and (especially) AI-generated slot
  // descriptions routinely wrap to 2+ lines, and a fixed advance made the
  // next row overlap the wrapped line. heightOfString() measures the real
  // rendered height (under the current font/size) before we move the
  // cursor, so wrapped text gets the vertical space it actually needs.
  const row = (main, sub) => {
    doc.font('Helvetica').fontSize(11);
    const mainH = doc.heightOfString(main, { width: textWidth });
    let subH = 0;
    if (sub) {
      doc.font('Helvetica').fontSize(9);
      subH = doc.heightOfString(sub, { width: textWidth });
    }
    ensureRoom(mainH + subH + 16);
    doc.fillColor(INK).font('Helvetica').fontSize(11).text(main, marginX, y, { width: textWidth });
    y += mainH + 2;
    if (sub) {
      doc.fillColor(TEXT_GREY).font('Helvetica').fontSize(9).text(sub, marginX, y, { width: textWidth });
      y += subH + 2;
    }
    doc.strokeColor(RULE).lineWidth(0.5)
      .moveTo(marginX, y).lineTo(pageWidth - marginX, y).stroke();
    y += 8;
  };

  sectionTitle(s.activities);
  (tier.activities || []).forEach(a => row(a));

  y += 6;
  sectionTitle(s.restaurants);
  (tier.restaurants || []).forEach(r => {
    const name = typeof r === 'string' ? r : r.name;
    const address = typeof r === 'object' ? r.address : '';
    row(name, address);
  });

  if (days && days.length) {
    y += 6;
    sectionTitle(s.dayByDay);
    days.forEach(d => {
      ensureRoom(30);
      doc.fillColor(NAVY).font('Times-Bold').fontSize(13)
        .text(d.title || `${lang === 'en' ? 'Day' : 'Jour'} ${d.day}`, marginX, y);
      y += 16;
      const slotTextWidth = pageWidth - marginX * 2 - 85;
      (d.slots || []).forEach(slot => {
        doc.font('Helvetica').fontSize(10);
        const slotH = Math.max(12, doc.heightOfString(slot.text || '', { width: slotTextWidth }));
        ensureRoom(slotH + 4);
        doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(8).text((slot.time || '').toUpperCase(), marginX, y, { width: 80 });
        doc.fillColor(INK).font('Helvetica').fontSize(10).text(slot.text || '', marginX + 85, y, { width: slotTextWidth });
        y += slotH + 6;
      });
      y += 6;
    });
  }

  // --- Footer (once, on the last page) ---
  const footerY = doc.page.height - 60;
  doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(marginX, footerY).lineTo(pageWidth - marginX, footerY).stroke();
  doc.fillColor(FOOTER_GREY).font('Helvetica').fontSize(8)
    .text(s.footerTagline, marginX, footerY + 10, { align: 'center', width: pageWidth - marginX * 2 })
    .text(s.footerLegal, marginX, footerY + 22, { align: 'center', width: pageWidth - marginX * 2 });

  doc.end();
}

module.exports = { buildItineraryPdf };
