# DECISIONS.md

Design and product decisions behind **Claim Check**. The three required
decision points (DP1–DP3) come first; the rest are supporting engineering
choices.

---

## DP1 — Feed order: recency first, risk on demand

**Decision.** The public feed is sorted **newest-first by default**, with an
explicit dropdown offering *“Risk — High Risk first”* and *“Oldest first”*.

**Reasoning.** A misinformation feed is a moving target: a claim that appeared
eleven minutes ago is the one about to hit five group chats, and a
recency-first list is the only ordering that keeps that firehose honest and
predictable — the top of the page always means “what is happening now”, and
users never have to wonder where a newly submitted item went. Risk-sorting is
the wrong *default* because risk scores are coarse (0–3 flags) and static;
sorted purely by risk, the feed would be pinned to the same handful of old,
loud claims forever. But risk-sorting is the right *triage tool*: a reviewer
with twenty minutes wants High Risk claims stacked at the top regardless of
when they arrived, so we expose it as a one-click sort rather than hiding it.
Keeping recency as the tie-breaker inside the risk sort means the ordering is
still stable and explainable.

---

## DP2 — Visibility: unverified claims stay public, clearly labelled

**Decision.** Unverified claims are **not held back**. They appear in the feed
and on their detail page with a distinct grey badge and the explicit line
*“Unverified — not yet fact-checked”*.

**Reasoning.** The people who most need this tool — journalists, community
moderators, fact-checkers — are exactly the ones who must be able to see the
rumour *before* it is confirmed, because by the time a claim is verified the
harm has already spread; a queue that hides unverified claims would remove the
tool’s entire value. The real risk of visibility is that a screenshot of the
feed could be shared as if the claim were confirmed, so the mitigation is not
absence but **unmistakable labelling**: a grey status colour used nowhere else,
a repeated “unverified” sentence on both the record row and the detail page,
and a status vocabulary that never says anything stronger than the evidence
allows. In short: transparency and speed win, and the cost is paid for with
persistent, redundant labeling rather than censorship.

---

## DP3 — Editing: claims are immutable once submitted

**Decision.** Claim text, platform and category **cannot be edited** after
submission. The review endpoint only ever updates `status`, `reviewer_note` and
`reviewed_at`. A mistake means submitting a new claim.

**Reasoning.** The thing being fact-checked is *the exact text that went
viral*; if the text can change after the fact, the verification record stops
describing the thing it claims to describe. Editing would also create an easy
escape hatch — a submitter could soften or rewrite a claim after it was rated
false, retroactively making the reviewer look wrong and the record useless as
evidence. Immutability keeps the audit trail trivially trustworthy: what you
read now is what was submitted then, timestamped once and never rewritten. The
cost (a duplicate row when someone makes a typo) is far cheaper than the cost
of a record whose contents can be quietly negotiated.

---

## Supporting engineering decisions

### Why SQLite (`better-sqlite3`)

The brief asks for a simple file-based database, and the access pattern —
single-digit writes per minute, read-heavy feed, one table — is exactly what
SQLite is best at. `better-sqlite3` was chosen over `sqlite3` because its API
is synchronous: no callbacks, no promise plumbing, and transaction support that
reads like plain JavaScript, which keeps the code explainable to a first-year
student.

### Why risk flags are computed only on the server

If the client computed the flags it could simply not send them. Everything
about the risk assessment happens inside `POST /api/claims`, so the flags in
the database are always a true function of the stored text. They are computed
**once, at submission time**, and never re-scored, so a later change to the
rule set cannot silently rewrite the history of an old record.

### Why “High Risk” is `flags >= 2`

Any single flag is weak evidence on its own: an all-caps message is suspicious
but common, and a missing link is normal in casual speech. Two or more flags
together is a much stronger signal, and using a simple count (rather than
weighting) means the rule can be stated in one sentence to a reviewer and
checked by eye.

### Why Reviewer Mode is a toggle instead of authentication

The brief forbids accounts, and adding a fake “admin password” would be
security theatre on a local utility. The toggle (persisted in `localStorage`)
makes the *intent* explicit — reading is public, deciding is a deliberate act —
and keeps the review controls out of the way of someone who only wants to read.
In production, this is the seam where real authentication would slot in: the
review endpoints are already separate from the public read endpoints.

### Why the frontend is three small scripts instead of one framework

The requirements mandate plain HTML/CSS/JS. Keeping `app.js` (shared), `feed.js`
and `detail.js` separate mirrors the page structure, avoids any build step, and
means the project can be opened from `file://` or any static host without
compilation.

### Why the reviewer note is mandatory

A status without a reason is not a fact-check, it is an assertion. Requiring a
short note makes the decision reviewable, keeps reviewers honest, and gives the
public the evidence rather than just the verdict.
