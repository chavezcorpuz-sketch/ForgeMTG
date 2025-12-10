const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const vision = require('@google-cloud/vision');
const axios = require('axios');

const upload = multer({ dest: 'uploads/' });
const app = express();
app.use(cors());
app.use(express.json());

const staples = JSON.parse(fs.readFileSync(path.join(__dirname, 'staples.json'), 'utf8'));

// Initialize Google Vision client: requires GOOGLE_APPLICATION_CREDENTIALS env var set
const client = new vision.ImageAnnotatorClient();

async function ocrImage(filePath) {
  const [result] = await client.textDetection(filePath);
  const detections = result.textAnnotations;
  if (!detections || detections.length === 0) return '';
  return detections[0].description || '';
}

async function scryfallFuzzy(name) {
  try {
    const q = encodeURIComponent(name);
    const resp = await axios.get(`https://api.scryfall.com/cards/named?fuzzy=${q}`);
    return resp.data;
  } catch (e) {
    try {
      const q2 = encodeURIComponent(name);
      const r2 = await axios.get(`https://api.scryfall.com/cards/search?q=${q2}&unique=prints`);
      if (r2.data && r2.data.data && r2.data.data.length > 0) return r2.data.data[0];
    } catch (e2) {}
    return null;
  }
}

app.post('/recognize', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const filePath = path.join(__dirname, req.file.path);
  try {
    const text = await ocrImage(filePath);
    const candidateLines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 6);
    let found = null;
    const tries = [];
    tries.push(candidateLines.join(' '));
    tries.push(candidateLines[0] || '');
    tries.push(candidateLines.slice(0,2).join(' '));
    for (const t of tries) {
      if (!t || t.length < 2) continue;
      const card = await scryfallFuzzy(t);
      if (card) { found = card; break; }
    }
    fs.unlinkSync(filePath);
    return res.json({ ocrText: text, scryfall: found });
  } catch (e) {
    console.error(e);
    try { fs.unlinkSync(filePath); } catch (er) {}
    return res.status(500).json({ error: String(e) });
  }
});

app.post('/analyze-archetype', async (req, res) => {
  try {
    const { commander_name, collection } = req.body || {};
    function extractTags(card) {
      const tags = new Set();
      const t = ((card.oracle_text||'') + ' ' + (card.type_line||'')).toLowerCase();
      if (/token|tokens/.test(t)) tags.add('token');
      if (/reanimat|reanimate|graveyard|graveyard/.test(t)) tags.add('reanimator');
      if (/creature|creatures/.test(card.type_line ? card.type_line.toLowerCase() : '')) tags.add('creature');
      if (/artifact/.test(t)) tags.add('artifact');
      if (/draw|card draw|draw a card|card advantage/.test(t)) tags.add('draw');
      if (/mana cost|tap to add|ramp|mana/.test(t)) tags.add('ramp');
      if (/counter|proliferate|+1\/+1|loyalty|planeswalker/.test(t)) tags.add('proliferate');
      return [...tags];
    }
    const tagCounts = {};
    (collection||[]).forEach(c => {
      const tags = extractTags(c);
      tags.forEach(t => tagCounts[t] = (tagCounts[t]||0)+1);
    });

    let commanderCard = null;
    if (commander_name) commanderCard = await scryfallFuzzy(commander_name);

    const sortedTags = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]);
    const topTag = sortedTags.length ? sortedTags[0][0] : null;

    const suggestions = [];
    if (!commanderCard) {
      (collection||[]).forEach(c => {
        const tline = (c.type_line||'').toLowerCase();
        if (/legendary/.test(tline) && /creature|planeswalker/.test(tline)) {
          suggestions.push({ name: c.name, card: c });
        }
      });
    }

    const selectedStaples = [];
    if (topTag && staples[topTag]) selectedStaples.push(...staples[topTag]);
    selectedStaples.push(...(staples['ramp']||[]));
    selectedStaples.push(...(staples['removal']||[]));
    selectedStaples.push(...(staples['draw']||[]));

    const deck = [];
    if (commanderCard) deck.push({ name: commanderCard.name, scryfall: commanderCard, role: 'Commander' });

    function isSubset(a,b) {
      const setB = new Set(b||[]);
      for (const x of (a||[])) if (!setB.has(x)) return false;
      return true;
    }

    const commanderColors = commanderCard ? (commanderCard.color_identity || []) : [];

    (collection||[]).forEach(c => {
      if (!commanderCard) return;
      if (c.id === commanderCard.id) return;
      if (isSubset(c.color_identity||[], commanderColors)) {
        deck.push({ name: c.name, scryfall: c, owned: true });
      }
    });

    let deckNames = new Set(deck.map(d=>d.name));
    for (const staple of selectedStaples) {
      if (deck.length >= 100) break;
      if (!deckNames.has(staple)) { deck.push({ name: staple, scryfall: null, owned: false }); deckNames.add(staple); }
    }

    const basicLands = ["Plains","Island","Swamp","Mountain","Forest"];
    let landIndex = 0;
    while (deck.length < 100) {
      const name = basicLands[landIndex % basicLands.length];
      deck.push({ name, scryfall: null, owned: false, type: "Basic Land" });
      landIndex++;
    }

    const collectionNames = new Set((collection||[]).map(c=>c.name));
    const annotated = deck.map(item => {
      const owned = collectionNames.has(item.name) || !!(item.scryfall && collection.find(c=>c.id === item.scryfall.id));
      return { ...item, owned: !!owned };
    });

    const total = annotated.length - 1;
    const ownedCount = annotated.slice(1).filter(x=>x.owned).length;
    const missingCount = total - ownedCount;

    res.json({
      commander: commanderCard ? { name: commanderCard.name, id: commanderCard.id, color_identity: commanderCard.color_identity } : null,
      suggestions,
      topTag,
      deck: annotated,
      summary: { total, owned: ownedCount, missing: missingCount }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => console.log(`ForgeMTG server listening on ${PORT}`));
