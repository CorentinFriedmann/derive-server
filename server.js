// server.js — the piece that only exists because the browser can't be
// trusted with an API key. Everything the frontend used to do directly
// (call Claude, fetch Wikipedia) now goes through here instead.
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { askClaude, parseJsonLenient } = require('./lib/claude');
const { renderDestinationPage } = require('./lib/destinationPage');
const { sendEmail } = require('./lib/resend');
const { buildItineraryPdf } = require('./lib/itineraryPdf');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.warn('⚠️  SESSION_SECRET manquante dans .env — les comptes utilisateurs échoueront tant qu\'elle n\'est pas définie.');
}

// ---------------------------------------------------------------------
// Auth — real accounts (email + password), sitting ALONGSIDE the existing
// anonymous sessionId rather than replacing it. A visitor without an
// account still works exactly as before (see trips/history routes below);
// logging in just gives req.user priority over the anonymous id.
// ---------------------------------------------------------------------

const AUTH_COOKIE = 'peacetrip_session';
const AUTH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function signAuthCookie(res, user) {
  const token = jwt.sign({ sub: user.id, email: user.email }, SESSION_SECRET, { expiresIn: '30d' });
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_COOKIE_MAX_AGE_MS
  });
}

// Runs on every request: if a valid auth cookie is present, attaches
// req.user = { id, email }. Never blocks the request either way — routes
// that require login check req.user themselves.
app.use((req, res, next) => {
  const token = req.cookies && req.cookies[AUTH_COOKIE];
  if (token && SESSION_SECRET) {
    try {
      const payload = jwt.verify(token, SESSION_SECRET);
      req.user = { id: payload.sub, email: payload.email };
    } catch (_e) { /* expired/invalid cookie — treat as logged out */ }
  }
  next();
});

// Builds the { sessionId, userId } pair the db layer expects, from
// whichever the request actually has.
function identityFrom(req, bodyOrQuery) {
  return { sessionId: bodyOrQuery.sessionId || null, userId: req.user ? req.user.id : null };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------
// /api/generate cache — skips the Claude call entirely when a near-
// identical request (same normalized prompt + budget + nights/travelers
// + language) was already answered in the last 24h. Deliberately NOT used
// when excludeDestinations is set ("propose autre chose" explicitly wants
// something different, caching would defeat the point).
// ---------------------------------------------------------------------

const GENERATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function normalizePromptForCache(text) {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function cacheKeyFor({ promptText, budgetLabel, nights, travelers, tags, lang }) {
  const raw = JSON.stringify({
    p: normalizePromptForCache(promptText),
    b: String(budgetLabel || '').trim().toLowerCase(),
    n: nights, t: travelers,
    tags: (tags || []).map(t => String(t).toLowerCase()).sort(),
    lang: lang === 'en' ? 'en' : 'fr'
  });
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Appended to the system prompts of /api/generate, /api/day-plan and
// /api/refine so the AI-generated content matches the frontend language
// (see public/i18n.js — `lang` travels with every one of those calls).
// The JSON schema's KEY names never change, only the text VALUES do.
function langDirective(lang) {
  if (lang !== 'en') return '';
  return ' IMPORTANT — respond entirely in English: every text VALUE (destination and country names, tier labels — e.g. "Essential"/"Comfort"/"Signature" instead of "Essentiel"/"Confort"/"Signature" —, hotel/activity/restaurant names, day titles and descriptions) must be in English. Only the JSON key names stay exactly as given in the schema.';
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives — réessayez dans quelques minutes.' }
});

// Shared by the three Claude-backed routes (/api/generate, /api/day-plan,
// /api/refine) — these are the actual cost/abuse surface the brief
// originally assumed was already covered. A real session can easily hit
// 15-20 calls (regenerate, refine a couple of tiers, open a few day
// plans), so this is sized generously above that rather than around a
// single generation.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de demandes — réessayez dans quelques minutes.' }
});

// Everything else that was still unprotected: trips/history read+write
// (no auth required — anyone can call these with a made-up sessionId, so
// without a limit they're an open door to flood the database) and the
// Wikipedia proxy (photo/gallery/export-pdf don't cost us API money, but
// hammering them is still free abuse of our server + Wikipedia's).
// Generous on purpose — a normal session calls these far more often than
// it calls the AI routes (every card render fetches a photo).
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de demandes — réessayez dans quelques minutes.' }
});

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const { email: rawEmail, password, sessionId } = req.body || {};
    const email = String(rawEmail || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Adresse email invalide.' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    if (db.findUserByEmail(email)) return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = db.createUser(email, passwordHash);
    if (sessionId) db.migrateGuestData(sessionId, userId);

    const user = { id: userId, email };
    signAuthCookie(res, user);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de créer le compte pour le moment.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email: rawEmail, password, sessionId } = req.body || {};
    const email = String(rawEmail || '').trim().toLowerCase();
    const row = db.findUserByEmail(email);
    // Same generic error whether the email is unknown or the password is
    // wrong — don't leak which emails have accounts.
    if (!row || !(await bcrypt.compare(password || '', row.passwordHash))) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }
    if (sessionId) db.migrateGuestData(sessionId, row.id);

    const user = { id: row.id, email: row.email };
    signAuthCookie(res, user);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Connexion impossible pour le moment.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user || null });
});

// Tells the frontend whether/where to load Plausible (privacy-friendly,
// cookieless analytics — no Google Analytics). Nothing loads until
// ANALYTICS_DOMAIN is set in .env, so this is a safe no-op out of the box.
app.get('/api/config', (req, res) => {
  res.json({ analyticsDomain: process.env.ANALYTICS_DOMAIN || null });
});

// ---------------------------------------------------------------------
// /api/generate — the main "3 destinations x 3 tiers" itinerary call
// ---------------------------------------------------------------------

app.post('/api/generate', aiLimiter, async (req, res) => {
  try {
    const { promptText, budgetLabel, nights, travelers, excludeDestinations, tags, lang } = req.body || {};
    if (!promptText || !nights || !travelers) {
      return res.status(400).json({ error: 'promptText, nights et travelers sont requis.' });
    }

    const useCache = !excludeDestinations || !excludeDestinations.length;
    const cacheKey = useCache ? cacheKeyFor({ promptText, budgetLabel, nights, travelers, tags, lang }) : null;
    if (cacheKey) {
      const cached = db.getCachedGeneration(cacheKey);
      if (cached) return res.json(cached);
    }

    const tierSchema =
      '{"key":"low","label":"Essentiel","hotel":{"name":"...","pricePerNight":0},"activities":["...","..."],"restaurants":["..."],"estimatedTotal":0},' +
      '{"key":"mid","label":"Confort","hotel":{"name":"...","pricePerNight":0},"activities":["...","...","..."],"restaurants":["...","..."],"estimatedTotal":0},' +
      '{"key":"high","label":"Signature","hotel":{"name":"...","pricePerNight":0},"activities":["...","...","...","..."],"restaurants":["...","...","..."],"estimatedTotal":0}';

    const systemPrompt =
      'Tu es le moteur de génération de séjours du site de voyage "Peacetrip". Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balises markdown. Schéma exact :\n' +
      '{"destinations":[{"destination":"Nom du lieu 1","country":"Pays","tiers":[' + tierSchema + ']},' +
      '{"destination":"Nom du lieu 2","country":"Pays","tiers":[' + tierSchema + ']},' +
      '{"destination":"Nom du lieu 3","country":"Pays","tiers":[' + tierSchema + ']}]}' +
      '\nPropose 3 destinations réelles et VRAIMENT DIFFÉRENTES les unes des autres (pays ou ambiance distincts), toutes adaptées à la demande, chacune avec ses 3 formules. Utilise des noms d\'hôtels/activités/restaurants réalistes pour chaque lieu. Prix en euros pour le nombre de voyageurs indiqué. Le niveau Essentiel doit être nettement moins cher que Signature, pour chaque destination. Reste très concis : chaque nom d\'activité ou de restaurant tient en 2 à 5 mots, pas de phrases descriptives. N\'utilise JAMAIS de guillemets doubles (") à l\'intérieur d\'un nom ou d\'un texte — cela casserait le JSON ; utilise des guillemets simples ou reformule sans guillemets.' +
      (excludeDestinations && excludeDestinations.length
        ? (' Ne propose aucune de ces destinations déjà vues : ' + excludeDestinations.join(', ') + ' — choisis 3 destinations différentes adaptées à la même envie.')
        : '') +
      langDirective(lang);

    const userMsg =
      `Demande du voyageur : "${promptText}${tags && tags.length ? ' (' + tags.join(', ') + ')' : ''}". ` +
      `Budget principal visé : ${budgetLabel || 'Confort'}. Nombre de nuits : ${nights}, pour ${travelers} voyageur(s).`;

    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const clean = await askClaude(systemPrompt, userMsg, 4000);
        const parsed = parseJsonLenient(clean);
        if (!parsed.destinations || !parsed.destinations.length) throw new Error('Réponse incomplète');
        parsed.destinations = parsed.destinations.filter(d => d.tiers && d.tiers.length >= 3).slice(0, 3);
        if (!parsed.destinations.length) throw new Error('Réponse incomplète');
        if (cacheKey) db.setCachedGeneration(cacheKey, parsed, GENERATION_CACHE_TTL_MS);
        return res.json(parsed);
      } catch (err) {
        lastErr = err;
        console.warn('generate attempt', attempt + 1, 'failed:', err.message);
      }
    }
    throw lastErr;
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Génération IA indisponible pour le moment.', detail: String(err.message || err) });
  }
});

// ---------------------------------------------------------------------
// /api/day-plan — day-by-day breakdown for one chosen tier
// ---------------------------------------------------------------------

app.post('/api/day-plan', aiLimiter, async (req, res) => {
  try {
    const { destinationFull, tier, nights, lang } = req.body || {};
    if (!destinationFull || !tier || !nights) {
      return res.status(400).json({ error: 'destinationFull, tier et nights sont requis.' });
    }

    const dayCount = Math.min(nights, 8);
    const remainingNights = nights - dayCount;
    const schema = remainingNights > 0
      ? '{"days":[{"day":1,"title":"...","slots":[{"time":"Matin","text":"..."},{"time":"Après-midi","text":"..."},{"time":"Soir","text":"..."}]}],"remainingSummary":"..."}'
      : '{"days":[{"day":1,"title":"...","slots":[{"time":"Matin","text":"..."},{"time":"Après-midi","text":"..."},{"time":"Soir","text":"..."}]}]}';

    const systemPrompt =
      'Tu composes un déroulé jour par jour pour un séjour déjà choisi. Réponds UNIQUEMENT en JSON valide, sans texte autour, schéma :\n' + schema +
      `\nGénère exactement ${dayCount} jours détaillés. Intègre l'hôtel, les activités et les restaurants fournis. IMPÉRATIF : chacune des activités listées ci-dessous doit apparaître au moins une fois dans le programme, sans exception — n'en oublie aucune, même si tu ajoutes aussi des créneaux libres ou des repas non listés autour. Chaque "text" doit tenir en une phrase courte (12 mots maximum). N'utilise jamais de guillemets doubles (") à l'intérieur d'un texte.` +
      (remainingNights > 0
        ? ` Le séjour compte ${nights} nuits au total : au-delà des ${dayCount} jours détaillés, remplis "remainingSummary" par 2-3 phrases courtes suggérant un rythme pour les ${remainingNights} nuits restantes, sans inventer un programme heure par heure.`
        : '') +
      (lang === 'en' ? ' IMPORTANT — respond entirely in English: day titles and every "text"/"remainingSummary" value must be in English (e.g. use "Morning"/"Afternoon"/"Evening" instead of "Matin"/"Après-midi"/"Soir" for the "time" field). Only the JSON key names stay as given in the schema.' : '');

    const userMsg =
      `Destination : ${destinationFull}. Formule : ${tier.label}. Hôtel : ${tier.hotel.name}. ` +
      `Activités disponibles : ${tier.activities.join(', ')}. Restaurants disponibles : ${tier.restaurants.join(', ')}.`;

    // Verify every listed activity actually made it into the schedule — a
    // model that's "integrating naturally" can still quietly drop one,
    // especially the most recently added one. One targeted retry, explicitly
    // naming what's missing, is cheap insurance against that.
    function findMissingActivities(days, activities) {
      const combined = (days || [])
        .flatMap(d => (d.slots || []).map(s => s.text || ''))
        .join(' ')
        .toLowerCase();
      return activities.filter(act => {
        const keyword = act.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(-2).join(' ') || act.toLowerCase();
        return !combined.includes(keyword) && !combined.includes(act.toLowerCase());
      });
    }

    let clean = await askClaude(systemPrompt, userMsg, 2400);
    let parsed = parseJsonLenient(clean);
    if (!parsed.days || !parsed.days.length) throw new Error('Plan vide');

    let missing = findMissingActivities(parsed.days, tier.activities);
    if (missing.length) {
      console.warn('Activités manquantes au 1er essai, nouvelle tentative :', missing);
      const retryUserMsg = userMsg + ` ATTENTION : dans un essai précédent, ces activités avaient été oubliées : ${missing.join(', ')}. Cette fois, assure-toi qu'elles apparaissent explicitement dans un créneau.`;
      try {
        const retryClean = await askClaude(systemPrompt, retryUserMsg, 2400);
        const retryParsed = parseJsonLenient(retryClean);
        if (retryParsed.days && retryParsed.days.length) {
          const stillMissing = findMissingActivities(retryParsed.days, tier.activities);
          if (stillMissing.length < missing.length) { parsed = retryParsed; missing = stillMissing; }
        }
      } catch (_e) { /* keep the first attempt if the retry itself fails */ }
    }

    res.json({ days: parsed.days, remainingNights, remainingSummary: parsed.remainingSummary || null });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Déroulé jour par jour indisponible pour le moment.', detail: String(err.message || err) });
  }
});

// ---------------------------------------------------------------------
// /api/refine — NEW: reshape ONE existing tier from free-text instructions
// ("enlève la visite du musée, ajoute une activité plus tranquille…")
// ---------------------------------------------------------------------

app.post('/api/refine', aiLimiter, async (req, res) => {
  try {
    const { destination, country, tier, instruction, nights, travelers, lang } = req.body || {};
    if (!destination || !tier || !instruction) {
      return res.status(400).json({ error: 'destination, tier et instruction sont requis.' });
    }

    const systemPrompt =
      'Tu ajustes UNE formule déjà existante d\'un séjour, à la demande du voyageur. Réponds UNIQUEMENT en JSON valide, sans texte autour, avec ce schéma exact :\n' +
      `{"key":"${tier.key}","label":"${tier.label}","hotel":{"name":"...","pricePerNight":0},"activities":["..."],"restaurants":["..."],"estimatedTotal":0}\n` +
      'Ne change PAS la destination. Ne change l\'hôtel que si la demande le dit explicitement — sinon garde le même. Pars de la formule actuelle fournie et modifie seulement ce que le voyageur demande, garde le reste identique autant que possible. Le nombre d\'activités et de restaurants doit rester cohérent avec la formule (Essentiel: 2 activités/1 restaurant, Confort: 3/2, Signature: 4/3), sauf si la demande dit explicitement d\'en ajouter ou d\'en enlever. Reste concis (2 à 5 mots par activité/restaurant), pas de phrases. N\'utilise jamais de guillemets doubles (") à l\'intérieur d\'un texte.' +
      (lang === 'en' ? ' IMPORTANT — respond entirely in English: "label", hotel/activity/restaurant names must be in English. Only the JSON key names stay as given in the schema.' : '');

    const userMsg =
      `Destination : ${destination}${country ? ', ' + country : ''}. Nuits : ${nights}, voyageurs : ${travelers}. ` +
      `Formule actuelle : ${JSON.stringify(tier)}. Demande du voyageur : "${instruction}".`;

    const clean = await askClaude(systemPrompt, userMsg, 900);
    const parsed = parseJsonLenient(clean);
    if (!parsed.hotel || !parsed.activities || !parsed.restaurants) throw new Error('Réponse incomplète');
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Remodelage indisponible pour le moment.', detail: String(err.message || err) });
  }
});

// ---------------------------------------------------------------------
// /api/photo & /api/gallery — server-side Wikipedia proxy.
// Doing this server-to-server sidesteps the browser CORS/sandbox issues
// that broke direct-from-browser Wikipedia calls in the claude.ai prototype,
// so real, accurate destination photos are back on the table.
// ---------------------------------------------------------------------

// Looking up a Wikipedia page by EXACT title match fails as soon as the
// AI-generated name is composite or slightly off from the real article
// title ("Dolomites - Val Gardena" instead of "Val Gardena"). Fuzzy search
// (the search API) fixes that by finding the closest article, the same way
// a human would using Wikipedia's own search box.
async function resolveWikipediaTitle(query, lang) {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&origin=*`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('search failed');
  const d = await r.json();
  const hit = d.query && d.query.search && d.query.search[0];
  if (!hit) throw new Error('no search result');
  return hit.title;
}

// Tries several variants of the name if the first yields nothing: the full
// name, then each part split on a dash/comma (useful for composite names
// like "Dolomites - Val Gardena" or "Kyoto, Japon").
function nameVariants(name) {
  const variants = [name];
  const parts = name.split(/[-,–—]/).map(p => p.trim()).filter(p => p.length > 2);
  parts.forEach(p => { if (!variants.includes(p)) variants.push(p); });
  return variants;
}

app.get('/api/photo', generalLimiter, async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: 'name requis' });

  const tryVariant = async (variant, lang) => {
    const title = await resolveWikipediaTitle(variant, lang);
    const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!r.ok) throw new Error('no page');
    const d = await r.json();
    if (d.thumbnail && d.thumbnail.source) return d.thumbnail.source;
    throw new Error('no thumbnail');
  };

  let src = null;
  outer:
  for (const variant of nameVariants(name)) {
    for (const lang of ['fr', 'en']) {
      try { src = await tryVariant(variant, lang); break outer; }
      catch (_e) { /* essaie la variante/langue suivante */ }
    }
  }
  res.json({ src });
});

app.get('/api/gallery', generalLimiter, async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: 'name requis' });

  const tryVariant = async (variant, lang) => {
    const title = await resolveWikipediaTitle(variant, lang);
    const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`);
    if (!r.ok) throw new Error('no media-list');
    const d = await r.json();
    const items = (d.items || []).filter(it =>
      it.type === 'image' && it.srcset && it.srcset.length &&
      !/\.svg(\?|$)/i.test(it.srcset[it.srcset.length - 1].src || '')
    );
    const urls = items.slice(0, 6).map(it => {
      const s = it.srcset[it.srcset.length - 1].src;
      return s.indexOf('//') === 0 ? 'https:' + s : s;
    });
    if (!urls.length) throw new Error('empty gallery');
    return urls;
  };

  let urls = [];
  outer:
  for (const variant of nameVariants(name)) {
    for (const lang of ['fr', 'en']) {
      try { urls = await tryVariant(variant, lang); break outer; }
      catch (_e) { /* essaie la variante/langue suivante */ }
    }
  }
  res.json({ urls });
});

// ---------------------------------------------------------------------
// Trips & search history — scoped by whichever identity the request has:
// a real user (req.user, from the auth cookie) if logged in, otherwise the
// anonymous session id the browser generates and stores in localStorage.
// Guest mode keeps working exactly as before — an account is optional.
// ---------------------------------------------------------------------

app.get('/api/trips', generalLimiter, (req, res) => {
  const identity = identityFrom(req, req.query);
  if (!identity.userId && !identity.sessionId) return res.status(400).json({ error: 'sessionId requis' });
  res.json(db.listTrips(identity));
});

app.post('/api/trips', generalLimiter, (req, res) => {
  const { sessionId, ...trip } = req.body || {};
  const identity = identityFrom(req, { sessionId });
  if (!identity.userId && !identity.sessionId) return res.status(400).json({ error: 'sessionId requis' });
  const id = db.insertTrip(identity, trip);
  res.json({ id });
});

app.delete('/api/trips/:id', generalLimiter, (req, res) => {
  const identity = identityFrom(req, req.query);
  if (!identity.userId && !identity.sessionId) return res.status(400).json({ error: 'sessionId requis' });
  db.deleteTrip(identity, req.params.id);
  res.json({ ok: true });
});

app.get('/api/history', generalLimiter, (req, res) => {
  const identity = identityFrom(req, req.query);
  if (!identity.userId && !identity.sessionId) return res.status(400).json({ error: 'sessionId requis' });
  res.json(db.listHistory(identity));
});

app.post('/api/history', generalLimiter, (req, res) => {
  const { sessionId, ...entry } = req.body || {};
  const identity = identityFrom(req, { sessionId });
  if (!identity.userId && !identity.sessionId) return res.status(400).json({ error: 'sessionId requis' });
  db.insertHistory(identity, entry);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// /api/email-itinerary — send the itinerary the visitor is looking at to
// their inbox, and keep a record so a human can follow up later. No
// automatic newsletter is wired up — marketingConsent just gets stored,
// unchecked by default (see the checkbox in the detail panel).
// ---------------------------------------------------------------------

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d\'envois — réessayez dans quelques minutes.' }
});

function escapeHtmlForEmail(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const EMAIL_STRINGS = {
  fr: {
    kicker: 'Votre itinéraire', formula: 'Formule', nights: 'nuits', traveler: 'voyageur', perNight: 'nuit',
    priceNote: 'Total estimé, vols et hôtel inclus',
    hotelSuggested: 'Hôtel suggéré', activities: 'Activités', restaurants: 'Tables suggérées',
    ctaDetail: 'Voir le détail et réserver',
    footerTagline: 'Décrivez votre envie, on trace le voyage.',
    footerLegal: 'Prix estimé à titre indicatif, à confirmer sur chaque plateforme de réservation. Peacetrip, entreprise individuelle — Corentin Friedmann.',
    receivedNote: 'Vous recevez cet email suite à votre demande sur peacetrip.com.',
    subject: (dest, label) => `Votre itinéraire ${dest} — ${label}`
  },
  en: {
    kicker: 'Your itinerary', formula: '', nights: 'nights', traveler: 'traveler', perNight: 'night',
    priceNote: 'Estimated total, flights and hotel included',
    hotelSuggested: 'Suggested hotel', activities: 'Activities', restaurants: 'Suggested restaurants',
    ctaDetail: 'View details and book',
    footerTagline: 'Describe what you want, we trace the trip.',
    footerLegal: 'Estimated price, to be confirmed on each booking platform. Peacetrip, sole proprietorship — Corentin Friedmann.',
    receivedNote: 'You are receiving this email because you requested it on peacetrip.com.',
    subject: (dest, label) => `Your ${dest} itinerary — ${label}`
  }
};

// Styled with fully inline styles (not a <style> + class block like the
// apercu-email.html mockup used) — Outlook desktop's rendering engine
// commonly ignores <head><style> blocks entirely, which would leave the
// email unstyled for a lot of recipients. Same colors/spacing/typography
// as the mockup, just inlined for real-world email client compatibility.
function buildItineraryEmailHtml({ destinationFull, tier, nights, travelers, lang, baseUrl }) {
  const s = EMAIL_STRINGS[lang === 'en' ? 'en' : 'fr'];
  // Always € — the AI is told to price in euros unconditionally, in French
  // or English, so "$" here would relabel the same number as a different
  // currency rather than convert it. See the matching note in itineraryPdf.js.
  const priceUnit = `${tier.hotel.pricePerNight}€`;
  const totalUnit = `${tier.estimatedTotal}€`;
  const metaLine = lang === 'en'
    ? `${tier.label} plan · ${nights} ${s.nights} · ${travelers} ${s.traveler}${travelers > 1 ? 's' : ''}`
    : `${s.formula} ${tier.label} · ${nights} ${s.nights} · ${travelers} ${s.traveler}${travelers > 1 ? 's' : ''}`;

  const itemRow = (main, sub, isLast) =>
    `<div style="padding:10px 0;border-bottom:${isLast ? 'none' : '1px solid #EEEEEE'};font-size:14px;color:#222222;">` +
    escapeHtmlForEmail(main) +
    (sub ? `<span style="color:#4C7A63;font-size:12px;display:block;margin-top:2px;">${escapeHtmlForEmail(sub)}</span>` : '') +
    `</div>`;

  const activityRows = (tier.activities || []).map((a, i, arr) => itemRow(a, null, i === arr.length - 1)).join('');
  const restaurantRows = (tier.restaurants || []).map((r, i, arr) => {
    const name = typeof r === 'string' ? r : r.name;
    const address = typeof r === 'object' ? r.address : '';
    return itemRow(name, address, i === arr.length - 1);
  }).join('');

  const sectionTitle = (title, first) =>
    `<h2 style="color:#0A2E3D;font-size:16px;text-transform:uppercase;letter-spacing:0.5px;margin:${first ? '0' : '26px'} 0 14px;border-bottom:2px solid #2E9E6B;padding-bottom:8px;">${escapeHtmlForEmail(title)}</h2>`;

  return `
    <div style="max-width:600px;margin:0 auto;background:#FFFFFF;font-family:Arial,Helvetica,sans-serif;">
      <div style="background:#0A2E3D;padding:28px 32px;text-align:center;">
        <img src="${baseUrl}/assets/logo.png" alt="Peacetrip" style="height:36px;">
      </div>

      <div style="background:#0F4257;padding:36px 32px 30px;text-align:center;">
        <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#2E9E6B;font-weight:bold;margin:0 0 10px;">${escapeHtmlForEmail(s.kicker)}</p>
        <h1 style="color:#EAF8F1;font-size:26px;margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;">${escapeHtmlForEmail(destinationFull)}</h1>
        <p style="color:#8FC4D6;font-size:14px;margin:0;">${escapeHtmlForEmail(metaLine)}</p>
      </div>

      <div style="background:#2E9E6B;padding:18px 32px;text-align:center;">
        <p style="color:#FFFFFF;font-size:28px;font-weight:bold;margin:0;">${totalUnit}</p>
        <p style="color:#EAF8F1;font-size:12px;margin:4px 0 0;">${escapeHtmlForEmail(s.priceNote)}</p>
      </div>

      <div style="padding:32px;">
        ${sectionTitle(s.hotelSuggested, true)}
        ${itemRow(tier.hotel.name, `~${priceUnit}/${s.perNight}`, true)}

        ${sectionTitle(s.activities)}
        ${activityRows}

        ${sectionTitle(s.restaurants)}
        ${restaurantRows}

        <div style="text-align:center;margin:30px 0 10px;">
          <a href="${baseUrl}/" style="display:inline-block;background:#0A2E3D;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;">${escapeHtmlForEmail(s.ctaDetail)}</a>
        </div>
      </div>

      <div style="background:#F3FAF7;padding:24px 32px;text-align:center;font-size:12px;color:#4C7A63;">
        <p style="margin:0;"><strong>Peacetrip</strong> — ${escapeHtmlForEmail(s.footerTagline)}<br>
        <a href="${baseUrl}/" style="color:#0F4257;">peacetrip.com</a> · <a href="mailto:contact@peacetrip.com" style="color:#0F4257;">contact@peacetrip.com</a></p>
        <p style="color:#8AA69A;font-size:11px;margin-top:10px;">${escapeHtmlForEmail(s.footerLegal)}<br>${escapeHtmlForEmail(s.receivedNote)}</p>
      </div>
    </div>
  `;
}

// Runs buildItineraryPdf (which streams) into a Buffer so it can ride
// along as a real email attachment instead of a "regenerate PDF" link —
// no shareable/persistent itinerary URL exists yet to link back to (see
// the honesty box on the homepage), so an attachment is the only way the
// "download PDF" promise is actually true today.
function buildItineraryPdfBuffer(opts) {
  return new Promise((resolve, reject) => {
    const { PassThrough } = require('stream');
    const stream = new PassThrough();
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    buildItineraryPdf(opts, stream);
  });
}

app.post('/api/email-itinerary', emailLimiter, async (req, res) => {
  try {
    const { email: rawEmail, destination, country, tier, nights, travelers, marketingConsent, lang } = req.body || {};
    const email = String(rawEmail || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Adresse email invalide.' });
    if (!destination || !tier || !tier.hotel) return res.status(400).json({ error: 'Itinéraire incomplet.' });

    const destinationFull = country ? `${destination}, ${country}` : destination;
    const s = EMAIL_STRINGS[lang === 'en' ? 'en' : 'fr'];
    const baseUrl = req.protocol + '://' + req.get('host');
    const nightsN = nights || 0;
    const travelersN = travelers || 1;

    const pdfFilename = destination.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.pdf';
    const pdfBuffer = await buildItineraryPdfBuffer({ destination, country, tier, nights: nightsN, travelers: travelersN, days: [], lang });

    await sendEmail({
      to: email,
      subject: s.subject(destinationFull, tier.label),
      html: buildItineraryEmailHtml({ destinationFull, tier, nights: nightsN, travelers: travelersN, lang, baseUrl }),
      attachments: [{ filename: pdfFilename, content: pdfBuffer.toString('base64') }]
    });

    db.insertEmailCapture(email, destinationFull, !!marketingConsent);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Envoi de l\'email indisponible pour le moment.', detail: String(err.message || err) });
  }
});

// ---------------------------------------------------------------------
// /api/export-pdf — same tier data as the email/txt export, as a PDF.
// ---------------------------------------------------------------------

app.post('/api/export-pdf', generalLimiter, (req, res) => {
  try {
    const { destination, country, tier, nights, travelers, days, lang } = req.body || {};
    if (!destination || !tier || !tier.hotel) return res.status(400).json({ error: 'Itinéraire incomplet.' });

    // ̀-ͯ is the combining-diacritics block NFD splits accents
    // into (e.g. "é" -> "e" + U+0301) — stripping it keeps "ile-de-re"
    // instead of losing accented letters outright.
    const filename = (destination || 'sejour').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    buildItineraryPdf({ destination, country, tier, nights: nights || 0, travelers: travelers || 1, days: days || [], lang }, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export PDF indisponible pour le moment.' });
  }
});

// ---------------------------------------------------------------------
// /destinations/:slug — server-rendered SEO pages, and /sitemap.xml.
// Content comes from content/destinations.json, written ahead of time by
// scripts/generate-destinations.js (one Claude call per destination, run
// manually/periodically) — never generated on the fly per visitor. Loaded
// once at startup; re-run the script + restart the server to refresh it.
// ---------------------------------------------------------------------

const DESTINATIONS_PATH = path.join(__dirname, 'content', 'destinations.json');
let destinationsCache = {};
try {
  destinationsCache = JSON.parse(fs.readFileSync(DESTINATIONS_PATH, 'utf8'));
} catch (_e) {
  console.warn('⚠️  content/destinations.json introuvable ou invalide — /destinations/:slug renverra 404 pour tout le monde. Lance node scripts/generate-destinations.js.');
}

app.get('/destinations/:slug', (req, res) => {
  const dest = destinationsCache[req.params.slug];
  if (!dest) return res.status(404).type('html').send('<p>Page de destination introuvable. <a href="/">Retour à Peacetrip</a>.</p>');
  const baseUrl = req.protocol + '://' + req.get('host');
  res.type('html').send(renderDestinationPage(dest, baseUrl));
});

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const urls = [baseUrl + '/'].concat(Object.keys(destinationsCache).map(slug => baseUrl + '/destinations/' + slug));
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => '  <url><loc>' + u + '</loc></url>').join('\n') + '\n</urlset>\n';
  res.type('application/xml').send(xml);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Peacetrip écoute sur http://localhost:${PORT}`));
