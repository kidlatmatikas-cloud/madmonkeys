// Vercel Serverless Function — POST /api/post-absence
//
// Fired automatically whenever a guildmate marks themselves absent from
// the public share link — no officer action needed. Posts to its OWN
// webhook (DISCORD_ABSENCE_WEBHOOK_URL), separate from the war-report
// webhook, so absence notices can go to a different channel than your
// war reports. If you want them in the same channel, just set both
// environment variables to the same webhook URL.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!process.env.DISCORD_ABSENCE_WEBHOOK_URL) {
    res.status(500).json({ error: 'DISCORD_ABSENCE_WEBHOOK_URL is not set on the server. Add it in Vercel → Project → Settings → Environment Variables.' });
    return;
  }

  const { memberName, date, lineupName } = req.body || {};
  if (!memberName || !date) {
    res.status(400).json({ error: 'Missing memberName or date' });
    return;
  }

  const embed = {
    title: 'Absence Reported',
    description: `**${memberName}** marked themselves absent for **${date}**`,
    color: 15022428, // magenta, matches the app's "absent" color elsewhere
    footer: lineupName ? { text: lineupName } : undefined,
    timestamp: new Date().toISOString(),
  };

  try {
    const discordRes = await fetch(process.env.DISCORD_ABSENCE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!discordRes.ok) {
      const text = await discordRes.text().catch(() => '');
      res.status(discordRes.status).json({ error: 'Discord rejected the message: ' + text.slice(0, 200) });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error while posting to Discord' });
  }
};
