// Vercel Serverless Function — POST /api/scan-discord
//
// Receives a base64 Discord screenshot (voice channel participant list,
// member sidebar, or a channel of people checking in) and asks Gemini to
// read out just the list of names present. Uses the same free Gemini tier
// as /api/scan — GEMINI_API_KEY only ever lives here.

const PROMPT = `You are reading a screenshot of a Discord app window. It shows a list of people — this could be a voice channel's participant list, the member sidebar, or a text channel where people typed their name or "here"/"present" to check in. Extract every distinct person's name you can find. Ignore channel names, server names, timestamps, message text unrelated to a name, emoji-only reactions, and UI chrome (mute/deafen icons, role headers like "ONLINE" or "OFFLINE", bot commands). If a name has a Discord discriminator or tag (like "#1234") or a nickname in parentheses, keep only the main display name. Respond with ONLY a raw JSON array of strings, one per distinct person, e.g. ["KYUJIN","poopboi","GiGi"]. No explanation, no markdown code fences, no duplicates.`;

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
        generationConfig: { maxOutputTokens: 2048, temperature: 0 },
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

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      res.status(500).json({ error: "Couldn't read a clear list of names from that screenshot. Try a clearer crop." });
      return;
    }
    if (!Array.isArray(parsed)) {
      res.status(500).json({ error: 'Unexpected response shape from the model' });
      return;
    }

    const names = [...new Set(parsed.map((n) => String(n || '').trim()).filter(Boolean))];
    res.status(200).json({ names });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error while scanning the screenshot' });
  }
};
