# Guild War Log — Deployment Guide

Full app: Overview, New Record (AI screenshot scanning via free Gemini),
Session Log, Full Roster, Attendance, Party List with public view-only
share links. Data lives in Supabase, hosted on Vercel.

This guide assumes a **clean start** — new GitHub repo, new Vercel
project — specifically to avoid the mixed-up state from earlier attempts.
You can reuse your existing Supabase project (Phase 1 below), since that
part never had problems.

**Total time: ~20 minutes if nothing goes sideways.**

---

## Phase 1 — Supabase (data storage)

You already have a working Supabase project from earlier, with the
schema already run. Nothing to do here — skip straight to Phase 2.

*(If you ever need to redo this from scratch: new Supabase project → SQL
Editor → paste `schema.sql` → Run → Project Settings → API for your
URL/key.)*

---

## Phase 2 — Get a free Gemini key (AI screenshot reading)

1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → sign in → **Create API Key**
2. Copy it (starts with `AQ.` or `AIza` depending on when Google generated it)
3. Genuinely free — no credit card. Keep this key somewhere safe for Phase 4.

Don't want AI scanning at all? Skip this — "+ Add row manually" always
works with zero setup.

---

## Phase 3 — Push the code to GitHub (do this carefully — this is where things went wrong before)

**The one rule that matters:** the `api` folder must stay a real folder
containing `scan.js` inside it — not a loose `scan.js` file sitting next
to it. Drag-and-drop from your file explorer sometimes flattens this.
The method below avoids that entirely.

1. [github.com](https://github.com) → **+** (top right) → **New repository** → any name → **Create repository**
2. On the empty repo page, click **uploading an existing file**
3. Drag in every file **except** the `api` folder: `index.html`, `view.html`,
   `package.json`, `vercel.json`, `schema.sql`
4. Scroll down → **Commit changes**
5. Now add the function file *by typing its path directly*, which always
   creates the folder correctly:
   - **Add file → Create new file**
   - In the filename box, type exactly: `api/scan.js`
   - Open `api/scan.js` from this project in a text editor, copy everything, paste it into GitHub's editor box
   - Scroll down → **Commit changes**
6. Refresh the repo page. Confirm you see **`api`** listed as a folder
   (not a loose file) — click into it, confirm `scan.js` is there.

If that all looks right, you're done with the fragile part.

---

## Phase 4 — Connect to Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project → Import Git Repository**
2. Pick the repo you just created
3. **Before deploying**, expand **Environment Variables** and add just this one:

   | Name | Value |
   |---|---|
   | `GEMINI_API_KEY` | your key from Phase 2 |

   (Your Supabase URL/key go directly into the HTML files instead, in
   the next step — this app is plain HTML, not a framework that reads
   Vercel env vars into the page.)

4. Click **Deploy**
5. Once it's live, copy your `https://something.vercel.app` URL

Using **Import Git Repository** here (not "Deploy without Git") is what
makes future updates easy — push a change to GitHub, Vercel redeploys
automatically, no more drag-and-drop each time.

---

## Phase 5 — Set your login password

Your Supabase URL and key are already filled into `index.html` and
`view.html` — nothing to do there.

The one thing worth changing: open `index.html`, find these two lines
near the top of the `<script>` section:

```js
const OFFICER_USERNAME = 'gucci';
const OFFICER_PASSWORD = 'Godisgood0723!';
```

If you're happy with these, skip this phase entirely. If you want to
change them, edit the values, then push the updated `index.html` back to
GitHub the same way as Phase 3 step 3 (**Add file → Upload files**, drag
it in, commit) — this triggers Vercel to redeploy automatically.

---

## Phase 6 — Test it

1. Visit `https://your-site.vercel.app/index.html`
2. Log in with your username/password
3. You should land on **Overview**, showing "Nothing recorded yet"
4. Go to **Full Roster**, add one test member
5. Go to **New Record**, try scanning a screenshot
6. If scanning fails, first check the simple thing: open
   `https://your-site.vercel.app/api/scan` directly in a new tab —
   - `{"error":"Method not allowed"}` = the function is deployed correctly, something else is wrong (tell me the exact error shown on the page)
   - a 404 "page not found" = the `api` folder didn't make it in correctly, redo Phase 3 step 5

---

## Using it day to day

- Add your roster once (Full Roster tab)
- Each WoE: New Record → scan or type in results → Save
- Party List → build lineups → **Copy Share Link** → send to guildmates (view-only, no login needed on their end)
- Future code updates: edit the file, upload it to GitHub the same way, Vercel redeploys on its own
