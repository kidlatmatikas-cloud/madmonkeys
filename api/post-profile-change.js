// Vercel Serverless Function — POST /api/post-profile-change
//
// Fired automatically whenever a guildmate updates their name or job
// from the public share link — no officer action needed. Posts to its
// OWN webhook (DISCORD_PROFILE_WEBHOOK_URL), separate from war-report
// and absence webhooks, so you can route these to whichever channel
// makes sense. Point it at the same webhook as the others if you'd
// rather keep everything in one channel.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!process.env.DISCORD_PROFILE_WEBHOOK_URL) {
    res.status(500).json({ error: 'DISCORD_PROFILE_WEBHOOK_URL is not set on the server.' });
    return;
  }

  const { oldName, newName, oldJob, newJob } = req.body || {};
  if (!oldName) {
    res.status(400).json({ error: 'Missing oldName' });
    return;
  }

  const lines = [];
  if (newName && newName !== oldName) lines.push(`**Name:** ${oldName} → **${newName}**`);
  if (newJob && newJob !== oldJob) lines.push(`**Job:** ${oldJob || 'none set'} → **${newJob}**`);
  if (lines.length === 0) {
    res.status(200).json({ ok: true, skipped: 'no actual change to report' });
    return;
  }

  const embed = {
    title: 'Profile Updated',
    description: `**${newName || oldName}** updated their info:\n${lines.join('\n')}`,
    color: 5814783, // cyan, matches the app's accent color
    timestamp: new Date().toISOString(),
  };

  try {
    const discordRes = await fetch(process.env.DISCORD_PROFILE_WEBHOOK_URL, {
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
