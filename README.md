# Daf Study — Tractate Sukkah

A study site for Tractate Sukkah combining three things: a Machon-Smicha-style
deep read of each amud (Mishnah, back-and-forth script, overview chart), a
Khan-Academy-style structure (quiz list, curriculum map), and a Duolingo-style
Aramaic vocabulary drill.

No build step, no framework — plain HTML/CSS/JS, content stored as JSON. Any
static file host works.

## Content sources

All primary-text content (Mishnah, Gemara, quiz questions) comes from:
- **[Sefaria](https://www.sefaria.org)** — Hebrew text and the William Davidson
  Edition English translation (CC-BY-NC).
- **[Dafyomi Advancement Forum](https://www.dafyomi.co.il)** (Kollel Iyun Hadaf)
  — background overviews, points to ponder, Tosfos summaries, and the quiz
  questions themselves (with answer keys pulled from that site's own quiz data).

Each daf's JSON file (`content/daf/*.json`) has a `sources` field naming what
was used. Quiz files (`content/quiz/*.json`) have a `source` field. When
adding a new daf, pull from those same sites rather than writing new material
from scratch — that's what keeps this accurate.

## Running it locally

Needs nothing but Python (for a static file server) or any equivalent:

```bash
python -m http.server 8420
```

Then open `http://localhost:8420`.

## Project layout

```
index.html, daf.html, quiz.html, quizzes.html, aramaic.html, curriculum.html
assets/css/site.css        — the whole design system
assets/js/                 — nav, score store, content loader, quiz/drill engines,
                              render-daf.js, render-flow.js (generic SVG diagram renderer)
content/manifest.json      — every daf/amud, locked or available
content/daf/{id}.json      — one file per amud (mishnah, before/after, opinions, script, flow)
content/quiz/{id}.json     — one quiz per amud
content/vocab/core.json    — Aramaic vocab set
```

## Adding a new daf

1. Add an entry to `content/manifest.json` (flip `status` from `"locked"` to
   `"available"`, fill in the title).
2. Pull the amud's text from Sefaria and the study aids from Dafyomi
   Advancement Forum (see URL patterns below).
3. Write `content/daf/{id}.json` following the shape of `2a.json`/`2b.json`.
4. Pull that daf's quiz questions verbatim (with answers) from the Dafyomi
   Advancement Forum quiz page — see "Extracting quiz answers" below — and
   write `content/quiz/{id}.json`.
5. Add any new recurring Aramaic terms to `content/vocab/core.json`.

Dafyomi Advancement Forum URL pattern for Sukkah (zero-padded 3-digit daf
number, e.g. daf 3 → `003`):

```
https://www.dafyomi.co.il/sukah/insites/su-dt-003.htm     — daf digest / overview
https://www.dafyomi.co.il/sukah/backgrnd/su-in-003.htm    — background
https://www.dafyomi.co.il/sukah/points/su-ps-003.htm      — points to ponder
https://www.dafyomi.co.il/sukah/halachah/su-hl-003.htm    — halachah l'maaseh
https://www.dafyomi.co.il/sukah/review/su-rg-003.htm?q=1  — review Q&A
https://www.dafyomi.co.il/sukah/quiz/su-qz-003.htm        — quiz
https://www.dafyomi.co.il/sukah/tosfos/su-ts-003.htm      — Tosfos summary
```

### Extracting quiz answers

The quiz pages render with JavaScript and don't show which option is
correct in the rendered HTML. The answer key is embedded in the page's
source as a data array — fetch the raw HTML and look for a block like:

```js
I[0]=new Array(); I[0][3]=new Array();
I[0][3][0]=new Array('True.', '', 0, 0, 1);
I[0][3][3]=new Array('Machlokes A&B.', '', 1, 100, 1);
```

The 3rd element of each option's array is `1` for the correct option (the
4th is its score, usually `100`). The 2nd element, if non-empty, is
Hebrew-encoded feedback text (`\uXXXX` escapes) worth decoding for the
`explain` field.

## Score tracking

`assets/js/store.js` saves quiz scores to `localStorage` by default (private
to each device). To make scores visible to both you and a study partner,
fill in `assets/js/firebase-config.js` with a free Firebase project's config
and set `enabled: true` — the store automatically starts syncing to
Firestore instead. Steps:

1. Create a free project at [firebase.google.com](https://firebase.google.com).
2. Add a Web App to it, enable Firestore (test mode is fine to start).
3. Copy the config object it gives you into `firebase-config.js`.
4. Set `enabled: true`.

Nothing else needs to change — `store.js` already knows how to use it.

## Deploying (GitHub Pages)

```bash
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

Then in the repo's Settings → Pages, set the source to the `main` branch,
root folder. The site will be live at
`https://<your-username>.github.io/<repo-name>/`.
