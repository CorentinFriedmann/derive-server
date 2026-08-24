// server.js — the piece that only exists because the browser can't be
// trusted with an API key. Everything the frontend used to do directly
// (call Claude, fetch Wikipedia) now goes through here instead.
require('dotenv').config();

const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY manquante dans .env — les appels de génération échoueront tant qu\'elle n\'est pas définie.');
}

// ---------------------------------------------------------------------
// Claude API call + the same lenient JSON parsing used in the prototype
// (kept here because it's the server that now owns the raw model output).
// ---------------------------------------------------------------------

async function askClaude(systemPrompt, userMsg, maxTokens) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens || 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }]
    })
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error('Anthropic API ' + response.status + ': ' + errText.slice(0, 300));
  }
  const data = await response.json();
  const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return textBlocks.replace(/```json|```/g, '').trim();
}

function repairInternalQuotes(text) {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && text[i - 1] !== '\\') {
      if (!inString) {
        inString = true;
        out += c;
      } else {
        let j = i + 1;
        while (j < text.length && /\s/.test(text[j])) j++;
        const next = text[j];
        const closesString = next === ',' || next === '}' || next === ']' || next === ':' || j >= text.length;
        if (closesString) { inString = false; out += c; }
        else { out += '\\"'; }
      }
    } else {
      out += c;
    }
  }
  return out;
}

function parseJsonLenient(text) {
  let s = text.trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);

  const candidates = [s, repairInternalQuotes(s)];
  let firstError = null;
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); }
    catch (e1) {
      if (!firstError) firstError = e1;
      const repaired = candidate.replace(/,(\s*[\]}])/g, '$1');
      try { return JSON.parse(repaired); }
      catch (e2) {
        const lastGoodArrayEnd = Math.max(repaired.lastIndexOf('},'), repaired.lastIndexOf('"],'));
        if (lastGoodArrayEnd > -1) {
          let salvage = repaired.slice(0, lastGoodArrayEnd + 1);
          const openBraces = (salvage.match(/{/g) || []).length - (salvage.match(/}/g) || []).length;
          const openBrackets = (salvage.match(/\[/g) || []).length - (salvage.match(/\]/g) || []).length;
          salvage += ']'.repeat(Math.max(openBrackets, 0)) + '}'.repeat(Math.max(openBraces, 0));
          try { return JSON.parse(salvage); } catch (e3) { /* try next candidate */ }
        }
      }
    }
  }
  throw firstError;
}

// ---------------------------------------------------------------------
// /api/generate — the main "3 destinations x 3 tiers" itinerary call
// ---------------------------------------------------------------------

app.post('/api/generate', async (req, res) => {
  try {
    const { promptText, budgetLabel, nights, travelers, excludeDestinations, tags } = req.body || {};
    if (!promptText || !nights || !travelers) {
      return res.status(400).json({ error: 'promptText, nights et travelers sont requis.' });
    }

    const tierSchema =
      '{"key":"low","label":"Essentiel","hotel":{"name":"...","pricePerNight":0},"activities":["...","..."],"restaurants":["..."],"estimatedTotal":0},' +
      '{"key":"mid","label":"Confort","hotel":{"name":"...","pricePerNight":0},"activities":["...","...","..."],"restaurants":["...","..."],"estimatedTotal":0},' +
      '{"key":"high","label":"Signature","hotel":{"name":"...","pricePerNight":0},"activities":["...","...","...","..."],"restaurants":["...","...","..."],"estimatedTotal":0}';

    const systemPrompt =
      'Tu es le moteur de génération de séjours du site de voyage "Dérive". Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balises markdown. Schéma exact :\n' +
      '{"destinations":[{"destination":"Nom du lieu 1","country":"Pays","tiers":[' + tierSchema + ']},' +
      '{"destination":"Nom du lieu 2","country":"Pays","tiers":[' + tierSchema + ']},' +
      '{"destination":"Nom du lieu 3","country":"Pays","tiers":[' + tierSchema + ']}]}' +
      '\nPropose 3 destinations réelles et VRAIMENT DIFFÉRENTES les unes des autres (pays ou ambiance distincts), toutes adaptées à la demande, chacune avec ses 3 formules. Utilise des noms d\'hôtels/activités/restaurants réalistes pour chaque lieu. Prix en euros pour le nombre de voyageurs indiqué. Le niveau Essentiel doit être nettement moins cher que Signature, pour chaque destination. Reste très concis : chaque nom d\'activité ou de restaurant tient en 2 à 5 mots, pas de phrases descriptives. N\'utilise JAMAIS de guillemets doubles (") à l\'intérieur d\'un nom ou d\'un texte — cela casserait le JSON ; utilise des guillemets simples ou reformule sans guillemets.' +
      (excludeDestinations && excludeDestinations.length
        ? (' Ne propose aucune de ces destinations déjà vues : ' + excludeDestinations.join(', ') + ' — choisis 3 destinations différentes adaptées à la même envie.')
        : '');

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

app.post('/api/day-plan', async (req, res) => {
  try {
    const { destinationFull, tier, nights } = req.body || {};
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
        : '');

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

app.post('/api/refine', async (req, res) => {
  try {
    const { destination, country, tier, instruction, nights, travelers } = req.body || {};
    if (!destination || !tier || !instruction) {
      return res.status(400).json({ error: 'destination, tier et instruction sont requis.' });
    }

    const systemPrompt =
      'Tu ajustes UNE formule déjà existante d\'un séjour, à la demande du voyageur. Réponds UNIQUEMENT en JSON valide, sans texte autour, avec ce schéma exact :\n' +
      `{"key":"${tier.key}","label":"${tier.label}","hotel":{"name":"...","pricePerNight":0},"activities":["..."],"restaurants":["..."],"estimatedTotal":0}\n` +
      'Ne change PAS la destination. Ne change l\'hôtel que si la demande le dit explicitement — sinon garde le même. Pars de la formule actuelle fournie et modifie seulement ce que le voyageur demande, garde le reste identique autant que possible. Le nombre d\'activités et de restaurants doit rester cohérent avec la formule (Essentiel: 2 activités/1 restaurant, Confort: 3/2, Signature: 4/3), sauf si la demande dit explicitement d\'en ajouter ou d\'en enlever. Reste concis (2 à 5 mots par activité/restaurant), pas de phrases. N\'utilise jamais de guillemets doubles (") à l\'intérieur d\'un texte.';

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

app.get('/api/photo', async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: 'name requis' });
  const tryLang = async (lang) => {
    const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
    if (!r.ok) throw new Error('no page');
    const d = await r.json();
    if (d.thumbnail && d.thumbnail.source) return d.thumbnail.source;
    throw new Error('no thumbnail');
  };
  let src = null;
  try { src = await tryLang('fr'); } catch (_e) { try { src = await tryLang('en'); } catch (_e2) { /* none found */ } }
  res.json({ src });
});

app.get('/api/gallery', async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ error: 'name requis' });
  const tryLang = async (lang) => {
    const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(name)}`);
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
  try { urls = await tryLang('fr'); } catch (_e) { try { urls = await tryLang('en'); } catch (_e2) { /* none found */ } }
  res.json({ urls });
});

// ---------------------------------------------------------------------
// Trips & search history — scoped by a session id the browser generates
// and stores in localStorage. This is NOT a real account system: there is
// no login, no password, no cross-device sync. Anyone with that random id
// (e.g. if it leaked) could read that session's saved trips. Good enough
// for a beta; swap for real auth (email/OAuth) before you have data you'd
// call "user accounts".
// ---------------------------------------------------------------------

app.get('/api/trips', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).json({ error: 'sessionId requis' });
  res.json(db.listTrips(sessionId));
});

app.post('/api/trips', (req, res) => {
  const { sessionId, ...trip } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId requis' });
  const id = db.insertTrip(sessionId, trip);
  res.json({ id });
});

app.delete('/api/trips/:id', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).json({ error: 'sessionId requis' });
  db.deleteTrip(sessionId, req.params.id);
  res.json({ ok: true });
});

app.get('/api/history', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).json({ error: 'sessionId requis' });
  res.json(db.listHistory(sessionId));
});

app.post('/api/history', (req, res) => {
  const { sessionId, ...entry } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId requis' });
  db.insertHistory(sessionId, entry);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Dérive écoute sur http://localhost:${PORT}`));
