# Naming decision + deploy links (session 2026-08-13/14)

## Name: **Kivilo**

Chosen 2026-08-14. Coined, globally neutral, unique search string.

**Latent story worth using:** *kivi* = **stone** in Finnish and Estonian. Ties to the
original "BlackRock / Keystone" instinct — "built on stone" is available as brand copy.

**Why it won:** unique string (owns its own SERP), no franchise IP, no collisions,
works identically in SG / KL / Jakarta / London, easy to spell and say in any accent.

**Known weaknesses (accepted):** abstract — carries no meaning until we give it some;
`-lo` ending sits in the phonetic neighbourhood of Zillow / Trulia (same industry).

### Domains (verified via registry whois with positive controls, 2026-08-13)
| Domain | Status |
|---|---|
| `kivilo.io` | **AVAILABLE** — register this |
| `kivilo.sg` | **AVAILABLE** |
| `kivilo.com` | taken (parked) |

**Not yet done: register the domains, and run IPOS + ACRA name checks before committing.**

### Runners-up (all had .io and/or .sg free at time of checking)
- **Kakutei** (確定, "finalised/filed/settled" — strongest meaning-to-product fit) — .io + .sg free
- **Ginkan** (銀館 "silver hall"; Kinkaku-ji/Ginkaku-ji Kyoto pairing) — .io + .sg free
- **Honkan** (本館 "main building"; 本 also = book/origin) — .io + .sg free
- **Koseki** (戸籍, the household register) — .io free
- **Deedbox** (strongbox for title deeds) — .io free
- **Ward** (LoL vision nod; guard / district / person held in trust) — no global TLD free
- **Inkan** (印鑑, the Japanese seal that executes documents) — no global TLD free

### Rejected — do not revisit
- **Rinkan** — 輪姦 is Japanese for **gang rape**. Never use.
- **Chop** — too close to Chope (large SG restaurant-booking platform).
- **Silph / Sylph** — Silph Co. is Nintendo/Game Freak IP; Nintendo enforces aggressively.
  (`sylph.sg` is the safer real-word variant if ever revisited.)
- **Kinkan** — `kinkan.sg` is a live SG bakery ("Kin Kàn", registered 2021, VerifiedID-OK);
  キンカン is also a well-known Japanese OTC ointment brand.
- **Legwork, Keeper, Steward, Lobby** — dictionary words, weak brand SEO.
- **Joist** — joist.com is an established contractor-invoicing app (adjacent market).
- **Frontdoor / Housekeep / Paperchase / Keyman** — existing brand collisions.

**Lesson for any future domain hunt:** every pronounceable 4–7 letter string is taken on
.com/.io/.app/.dev. Always run a positive control (e.g. google.com) before trusting any
"available" result — rdap.org and several registry whois servers return false positives.

---

## Live deploys

### Pitch deck — based.page (password-protected)
- URL: **https://kivilo-deck.based.page**
- Password: **`builtonstone`** (on-theme: kivi = stone)
- No-password share link (token grants access automatically):
  `https://kivilo-deck.based.page/?_token=Amg9JPaZJypb.1789217361936.32c8748e622c0e3ab3c2c6bcb6d6579f80d9bc44b9a574d55158ba434a9fc5f6`
- Deployment ID: `Amg9JPaZJypb` (needed for `PUT /deploy/:id` updates)
- Source: `plans/pitch-deck.html` (this repo). Deploy = wrap in a full HTML document
  (the file has no `<html>`/`<head>` wrapper) and POST/PUT to `api.based.page`.
  API key at `~/.based-page/credentials.json`.

### Pitch deck — Claude artifact (no password)
https://claude.ai/code/artifact/12118e55-6b73-4406-a10f-638b168333eb

### based.page gotchas
- **Single-word slugs are reserved** — hence `kivilo-deck`, not `kivilo`.
  Allowlist is `ALLOWED_SINGLE_WORD_SLUGS` in `based-page-api/src/routes/deploy.ts`.
  Decided NOT to touch it.
- Cloudflare blocks default Python/urllib user-agents on `api.based.page` (403 code 1010).
  Use curl with a browser UA.
- A `custom_domain` column is being added to based-page — once `kivilo.io` is registered,
  point it at this deployment instead of fighting the slug rule.

---

## Deck contents (as deployed)
Slide order: problem → solution (5 modules) → M1 deal wizard → M2 signing chains →
M3 compliance → M4 check-in/out → M5 the record/watchtower → rollout → close.

- Branding: hopshift palette (pink-500 `#EC4899` + Tailwind grays), light theme only.
- Mock-ups are full app shells (sidebar, ⌘K bar, breadcrumbs, realistic data).
- Walkthrough photo is an **unfurnished** room with bounding boxes registered to real
  objects (blinds, mirrored wardrobe, power point).
- Passport in the CDD mock is a clearly-marked **SPECIMEN**, not a real document.
- No pricing slide (removed), no personal contact details.
- Presenter nav: arrow keys / space / Home / End, position dots, print-to-PDF CSS.

## Verified stats used in the deck
- ~85k private residential rental contracts/yr in SG (~20k per quarter:
  Q1 2025 = 20,724; Q2 2025 = 21,330, URA/IRAS stamp-duty lodgements).
- Estate Agents (PMLPFTF) Regulations **2021** brought CEA agents under AML/CFT.
- Inspection labour cost S$150–380/report (Rentify's published tiers).
- **CEA Form 7** = exclusive estate agency agreement, lease, *landlord* side
  (Form 8 = tenant side). Earlier drafts wrongly said Form 3 — fixed.
