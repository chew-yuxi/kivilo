# Product Spec — Property Transaction & Oversight Platform (Kivilo)

**One-liner:** A deal record that fills its own paperwork — one property record, many permissioned views, from deal-close forms to check-in/check-out to tenancy oversight.

**Market context (researched 2026-08):** Singapore agent tooling is point solutions
(PropKaki = form templates, PropClear/amlapps.sg/AML Square = standalone AML, Rentify/
Expat Handovers/Meridius = human inspection services). Nobody owns the integrated deal
record. UK niche leaders (Inventory Hive ~$1.1M rev, InventoryBase ~$1–5M) prove the
standalone inspection app is a small business; the escape is the record + multi-stakeholder
platform. AI collapses inspection labor cost (~$100 human → ~$1 inference), making
per-transaction self-serve viable for the first time.

---

## 1. Core architectural insight

Every module is a different **view over the same three objects**. Enter data once at
deal creation; everything downstream (forms, signatures, invoices, inspection reports,
portals) is generated from and archived against the record.

### The data spine

**Stakeholder** — individual or entity.
- Individual: name, NRIC/FIN/passport, contact, residency status. Design for manual
  entry; Singpass/MyInfo pre-fill as an upgrade (requires approval — apply early).
- Entity: UEN → ACRA lookup → registered name, directors, shareholders → UBO tree
  (feeds AML/CDD automatically).
- Stakeholders are reusable across deals. Second deal with the same landlord = zero re-entry.

**Property** — the durable hub. Address (pre-seed the ~3,000 condo developments +
HDB blocks), type (HDB / private non-landed / landed / commercial), tenure.
Property type drives which forms apply. The record **outlives every relationship on
it** — accumulating tenancies, condition reports, defect history, appliance inventory.

**Transaction** — type (lease | sale), side represented (landlord/tenant,
vendor/purchaser), price/rent, term, agent, co-broke agent, key dates.
`type × side × stakeholder-kind × property-type` → the exact form set, signing chain, and
countersigning order. **This decision table is the core IP — get it right first.**

### Access model: (stakeholder, role, scope, time-window)

Never "user sees property." Examples:
- Tenant: TA, check-in/out reports, payment status. Not landlord's other units.
- Agent: bound to the estate agency agreement; **expires with the mandate.**
- Co-broke agent: the deal room only, not property history.
- Relocation company / employer HR: lease terms + move dates, not landlord identity docs.
- Property manager: delegated landlord scope, revocable.
- Record ownership: platform-held, **landlord-anchored**. Agents get mandate-scoped
  tenancy on the record; we sell agents the workflow, not the data.

---

## 2. Modules

**Build order (decided 2026-08-13): M4 check-in/out ships FIRST, time-boxed to
one month from today (go-live ~2026-09-13; timebox is internal, not on the deck).**
Rationale: M4 is the only module that delivers value standalone — no record history,
no integration, works on an agent's next handover. Every report filed seeds a
property record that M1–M3 later build on. Then M1 → M2 → M3 → M5.

### M1 — Deal wizard + form engine
"New deal → lease/sale → side → stakeholders → property" → out come pre-filled:
- CEA estate agency agreement (Forms 1–8 per CEA prescribed set)
- CDD/AML forms (A1 individual, A2 entity, B, ECDD) under Estate Agents (PMLPFTF)
  Regulations 2021 — incl. UCPDD for unrepresented counterparties
- TA / OTP / S&P per transaction type
- Commission invoice (1 deal may need 5+ documents; generate all from the record)
- Check early: licensing constraints on reproducing/modifying CEA form templates.

### M2 — Signing & counter-signing
Sequenced routing (e.g. tenant → landlord countersign → agent → co-broke), reminders,
full audit trail. Native e-sign (valid under Electronic Transactions Act for these
docs) — the signing *sequence logic tied to the form set* is the UX win; don't resell
DocuSign.

### M3 — AML/CDD layer
Sanctions/PEP/RCA screening, UBO resolution from ACRA data already on the Stakeholder,
ECDD escalation, STR paper trail. Competitors exist standalone; we win because the
data is already in the deal record.
- **Screening as an integrated service** (buy, don't build):
  - MVP provider: OpenSanctions (aggregated sanctions/PEP/watchlists, matching API,
    cheap, self-hostable). Enterprise upgrade path: ComplyAdvantage / Dow Jones /
    LSEG World-Check when large agencies demand a recognized name.
  - Screen on stakeholder creation, automatically: fuzzy/alias matching on name,
    DOB, nationality. For entities, screen the whole UBO tree from the ACRA lookup.
  - Ongoing monitoring: nightly re-screen of the full book against list updates;
    mid-tenancy hit raises an alert.
  - Every result (incl. "no match") archived to the deal record with timestamp and
    list versions; the CDD form generates with the screening reference pre-filled.
  - Hit workflow: potential match → review task (true/false positive) → true match
    blocks pack generation and escalates to ECDD; STR guidance on confirmed cases.
- **Identity & immigration verification** (part of CDD, runs before the TA generates):
  - Passport: MRZ parse + checksum, expiry check, face match against selfie/photo.
  - Work passes via MOM status check (SGWorkPass/API): EP, S Pass, Work Permit —
    validity, expiry, employer.
  - Dependant's Pass / LTVP for every listed occupier, not just the named tenant.
  - Recheck triggers: renewal, pass expiry date, mid-tenancy revocation.
  - Legality hook: landlords/agents are obligated to verify occupiers' immigration
    status — this turns a compliance chore into a product feature.

### M4 — Check-in / check-out (AI)
- Capture: continuous narrated video walkthrough (tenant or agent, ~10 min).
- Generate: room segmentation, fixture/appliance/meter detection, transcription →
  draft inventory + condition report. AI is the **scribe, not the witness**:
  timestamped raw video is the evidence; both stakeholders countersign.
- Check-out diff: compare against move-in record → flag changes → draft
  damage vs fair-wear-and-tear assessment (the dispute moment is the product).
- Attaches to the lease record; resurfaces automatically at check-out. Retention hook
  across the tenancy's dead time.

### M5 — Portals + tenancy management
Landlord / tenant / agent / PM views over the same record. Renewals, deposit status,
defect requests. Last — only valuable once records exist. Every invited stakeholder is an
acquisition channel; every view must work at zero learning curve.

---

## 3. Synergy loop

Deal wizard populates the record → forms/signing consume it → AML consumes it →
check-in attaches to it → renewal/check-out re-activates it → next deal reuses the
stakeholders → next tenancy inherits the property history. Each module makes the next one
free to start. The longitudinal property file is the compounding asset and the moat
(capture layer will commoditize; the record + counterparty network won't).

## 4. Monetization path

1. Agent SaaS (S$30–50/mo) for M1–M3 — daily-pain wedge, every closed deal.
2. Per-report pricing for AI check-in/out (S$30–60, self-serve tenant/landlord side).
3. Later: the condition + tenancy dataset prices deposit risk → deposit
   insurance/replacement product (the Speedhome move). This is the venture-scale story.

## 5. Early decisions

| Decision | Recommendation |
|---|---|
| Sell to agents vs agencies | Start individual agents (viral, fast); agencies as channel later |
| Singpass/MyInfo | Design manual-first, MyInfo as upgrade; apply early |
| CEA form licensing | Verify before building form engine around prescribed templates |
| Record ownership | Platform-held, landlord-anchored, mandate-scoped agent access |
| E-sign | Native, ETA-compliant; signing-sequence logic is differentiator |

## 6. UX bar

Top-tier UK/US application quality (Linear/Stripe-grade). The SG agent-software bar is
on the floor; congruent, fast, zero-learning-curve UI is a primary differentiator, not
polish. Branding: hopshift palette (pink-500 #EC4899 primary family + Tailwind grays).

## 7. MVP cut (M1 thin slice)

Lease-only, private residential, agent represents landlord, individual stakeholders:
wizard → pre-filled CEA agreement + CDD A1 + TA + invoice → PDF out + basic e-sign.
Proves the decision table + record reuse. Everything else is scope creep until this
closes real deals for 3–5 friendly agents.
