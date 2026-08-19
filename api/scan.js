// Vercel Serverless Function — POST /api/scan
//
// Receives a base64 screenshot from the browser, asks Google Gemini to read
// the scoreboard, and returns structured rows. Gemini has a genuinely free
// tier (no credit card required) that's plenty for a guild scanning a
// screenshot or two per war.
//
// GEMINI_API_KEY only ever lives here (set it in Vercel → Project →
// Settings → Environment Variables) — never sent to or visible from the
// browser.
//
// Get a free key: https://aistudio.google.com/apikey

const PROMPT = `You are reading a scoreboard screenshot from a mobile MMORPG guild siege event. The table has columns: Rank (shows "MVP" for the top row, then numbers like 2, 3, 4...), Player Name, "Tablets captured/Monsters" (two numbers separated by a slash: tablets captured, then monsters), "K/A/D" (three numbers separated by slashes: kills, assists, deaths), and Total Score. Read every row top to bottom and extract it into a JSON array with this exact schema and short keys: [{"r":"rank exactly as shown, e.g. MVP or 2 or 3","n":"player name exactly as shown, keep original capitalization","t":tablets_captured_as_number,"m":monsters_as_number,"k":kills_as_number,"a":assists_as_number,"d":deaths_as_number,"s":total_score_as_number}]. Use 0 for any missing or unreadable number. Do not skip any row. Respond with ONLY the raw JSON array. No explanation, no markdown code fences, no extra text.`;

// If Google renames/retires this model later, swap the string here.
const GEMINI_MODEL = 'gemini-3.6-flash';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server. Add it in Vercel → Project → Settings → Environment Variables.' });
    return;
  }

  const { imageBase64, mediaType } = req.body || {};
  if (!imageBase64 || !mediaType) {
    res.status(400).json({ error: 'Missing imageBase64 or mediaType in request body' });
    return;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mediaType, data: imageBase64 } },
          ],
        }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0 },
      }),
    });

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      res.status(geminiRes.status).json({ error: data?.error?.message || 'Gemini API error' });
      return;
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      res.status(500).json({ error: 'No readable response from the model' });
      return;
    }

    let raw = text.trim();
    raw = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start >= 0 && end >= 0) raw = raw.slice(start, end + 1);

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      res.status(500).json({ error: 'Unexpected response shape from the model' });
      return;
    }

    const rows = parsed
      .map((r) => ({
        rank: String(r.r || '').trim(),
        name: String(r.n || '').trim(),
        tablets: Number(r.t) || 0,
        monsters: Number(r.m) || 0,
        kills: Number(r.k) || 0,
        assists: Number(r.a) || 0,
        deaths: Number(r.d) || 0,
        score: Number(r.s) || 0,
      }))
      .filter((r) => r.name.length > 0);

    res.status(200).json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error while scanning the screenshot' });
  }
};
