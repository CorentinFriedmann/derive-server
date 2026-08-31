// lib/claude.js — the Claude API call + the lenient JSON parsing every route
// (and the one-off destination-page generator script) shares. Kept as its
// own module so a plain Node script can reuse it without booting the whole
// Express app (server.js calls app.listen() as a side effect of loading).

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY manquante dans .env — les appels de génération échoueront tant qu\'elle n\'est pas définie.');
}

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

module.exports = { askClaude, parseJsonLenient };
