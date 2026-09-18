# Claim Check

**Hackathon ID: <PUT_YOUR_ID_HERE>**

A lightweight **misinformation triage platform** for newsrooms and citizen
fact-checking groups. Anyone can paste a viral claim, the server scores it with
automatic risk flags, and a reviewer can put a documented decision on the
public record — all without an account.

---

## 1. What it does

| # | Feature | Where |
|---|---------|-------|
| 1 | **Submit a claim** (text + platform + category, stored as `Unverified` with a timestamp) | Left panel on the home page → `POST /api/claims` |
| 2 | **Automatic risk flags** (`Sensational`, `Shouting`, `Unsourced`; 2+ flags ⇒ `High Risk`) | `backend/risk.js` (and its mirror `src/lib/cc/risk.ts`) |
| 3 | **Review workflow** (Unverified → Verified True / Verified False / Misleading, with a required note) | “Reviewer Mode” toggle on every page → `POST /api/claims/:id/review` |
| 4 | **Public feed** (colour-coded status badges, High Risk indicator, filter by category + status, sort by newest / risk / oldest) | Home page → `GET /api/claims` |
| 5 | **Detail view** (full text, platform, category, all triggered flags, reviewer note, timestamps) | `claim.html?id=N` → `GET /api/claims/:id` |

---

## 2. Tech stack (as required)

* **Frontend:** plain **HTML + CSS + vanilla JavaScript**. No React, no Vue, no
  bundler. Three small scripts (`app.js` shared helpers, `feed.js` home page,
  `detail.js` record page).
* **Backend:** **Node.js + Express**, organised into `server.js`,
  `routes/`, `db.js`, `risk.js`, `validation.js`, `seed.js`.
* **Database:** **SQLite** via `better-sqlite3` (single file, no server).
* **Config:** `dotenv` for `PORT` and `SQLITE_PATH`.

---

## 3. Project structure

```
.
├── frontend
│   ├── html
│   │   ├── index.html          # submit form + public feed + filters
│   │   └── claim.html          # detail view / review page
│   ├── css
│   │   └── styles.css          # the whole design system (documented in-file)
│   └── js
│       ├── app.js              # API client, formatting, badges, Reviewer Mode
│       ├── feed.js             # home page: submit, filter, sort, render
│       └── detail.js           # record page: risk ledger + review form
│
├── backend
│   ├── server.js               # Express app entry point (API + static files)
│   ├── db.js                   # SQLite connection + schema bootstrap
│   ├── risk.js                 # the automatic risk-flag engine (pure functions)
│   ├── validation.js           # shared input validation + allowed values
│   ├── seed.js                 # inserts 9 example claims (node backend/seed.js)
│   └── routes
│       └── claims.js           # all /api/claims endpoints
│
├── database
│   ├── schema.sql              # the table definition (read by both servers)
│   └── claimcheck.sqlite       # created automatically on first run / seed
│
├── src                         # thin preview host (see §7)
│   └── (api routes + static file serving for the in-browser preview)
│
├── README.md
└── DECISIONS.md                # DP1 / DP2 / DP3 reasoning
```

---

## 4. Run it locally

### Prerequisites

* **Node.js 18+** (developed on Node 22)
* `npm` (or `pnpm` / `yarn`)

### Step 1 — install dependencies

```bash
npm install
```

### Step 2 — seed the database (optional but recommended)

```bash
node backend/seed.js           # inserts 9 example claims
node backend/seed.js --reset   # wipes the table first, then re-seeds
```

If you skip this step the app still works — the table is created
automatically on first boot and the feed will simply be empty.

### Step 3 — start the backend (serves the API *and* the frontend)

```bash
node backend/server.js
# or, to use a different port:
PORT=4000 node backend/server.js
```

### Step 4 — open the app

```
http://localhost:4000
```

That single server handles everything:

* `http://localhost:4000/` — submit + public feed
* `http://localhost:4000/claim.html?id=1` — detail / review page
* `http://localhost:4000/api/claims` — raw JSON feed

> Prefer to serve the frontend separately? Any static file server pointed at
> `frontend/` works too, because all API calls are relative (`/api/...`).
> Just make sure the API origin is reachable, e.g.
> `npx serve frontend` on port 3000 while the backend runs on 4000, and open
> the pages through the backend URL so the relative paths resolve.

---

## 5. Environment variables

Everything has a sensible default — **no environment variable is required to
run the project.**

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `4000` | Port the Express server listens on |
| `SQLITE_PATH` | `database/claimcheck.sqlite` | Absolute/relative path to the SQLite file |

Create a `.env` file in the project root if you want to override them:

```env
PORT=4000
SQLITE_PATH=./database/claimcheck.sqlite
```

---

## 6. API reference

All request/response bodies are JSON.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | Liveness probe |
| `GET`  | `/api/claims` | Feed. Query params: `category`, `status`, `sort` (`newest` \| `risk` \| `oldest`) |
| `POST` | `/api/claims` | Submit a claim: `{ "claimText", "platform", "category" }` |
| `GET`  | `/api/claims/options` | Allowed dropdown values + live counters |
| `GET`  | `/api/claims/:id` | Full detail record |
| `POST` | `/api/claims/:id/review` | Review: `{ "status", "reviewerNote" }` |

**Validation rules**

* `claimText`: required, 10–2000 characters after trimming.
* `platform`: one of `WhatsApp`, `X`, `Instagram`, `Other`.
* `category`: one of `Politics`, `Health`, `Finance`, `Other`.
* `status` (review): one of `Verified True`, `Verified False`, `Misleading`.
* `reviewerNote`: required, 5–1000 characters.

Errors always come back as
`{ "error": "...", "details": ["human readable", ...] }` with a `400` status.

**Example**

```bash
curl -X POST http://localhost:4000/api/claims \
  -H "Content-Type: application/json" \
  -d '{"claimText":"BREAKING!!! SHARE THIS BEFORE IT IS DELETED!!!","platform":"X","category":"Politics"}'
```

---

## 7. Note on the in-browser preview host (`/src`)

The `frontend/`, `backend/` and `database/` folders are the **canonical,
standalone implementation** and are what the instructions above run.

This repository is also executed by a managed preview runtime that builds a
Node server from `src/`. So that the preview shows the *same* application
rather than a rewrite, `src/` contains a thin adapter that:

* serves the untouched `frontend/` HTML/CSS/JS files, and
* exposes the identical `/api/claims*` endpoints against the identical
  `database/claimcheck.sqlite` file (`src/lib/cc/*` mirrors
  `backend/risk.js`, `backend/validation.js` and `backend/routes/claims.js`).

You can delete `src/` entirely and the Express app in §4 keeps working.

---

## 8. Design notes

The interface is deliberately built like a **newspaper copy-desk intake
ledger**: warm newsprint background, hairline rules instead of shadowed cards,
tabular figures for every number, and tracked small-caps labels. Colours are
used only where they carry meaning — status badges and risk indicators — so a
reviewer can scan twenty records without reading a word of decoration.

* Type: *Libre Baskerville* (display), *Public Sans* (UI), *IBM Plex Mono*
  (data / timestamps / flags).
* Motion: 120–240 ms CSS transitions only, and fully disabled under
  `prefers-reduced-motion`.
* Accessibility: visible focus rings, keyboard-navigable feed rows
  (`role="link"` + `Enter`/`Space`), `aria-live` feed, labelled form controls.

---

## 9. “Standard API” / track-spec note

> **Edit this note as needed for your submission.**
>
> No external or third-party “standard API” was required by the project brief,
> so none is consumed. Instead, **Claim Check exposes its own small, documented
> JSON API** (§6) with consistent REST-style paths, JSON error envelopes and
> server-side validation — the endpoints any track spec would normally ask for
> (`GET` collection, `GET` by id, `POST` create, `POST` action) are all
> implemented and used by the frontend itself.

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Cannot find module 'better-sqlite3'` | Run `npm install` again — it is a native module. |
| Feed shows “Could not load the feed” | The backend is not running. Start it with `node backend/server.js`. |
| Feed is empty | Seed it: `node backend/seed.js`. |
| `SQLITE_CANTOPEN` | Make sure the `database/` folder is writable, or set `SQLITE_PATH`. |
| Changes to `schema.sql` not applied | SQLite cannot alter existing tables automatically. Run `node backend/seed.js --reset` after deleting `database/claimcheck.sqlite`. |
