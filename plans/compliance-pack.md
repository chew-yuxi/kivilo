# Compliance pack: CEA due diligence for rental deals

Status: **building**, branch `claude/compliance-pack`. Written 2026-10-29, revised the same day after review. Needs
owner approval, and the legal checks at the end before customers use it. Part of Pro
(`plans/monetization.md`).

## The promise

"Every rental deal's CEA due diligence done in minutes, before the deal is signed: the
client fills in their own particulars, Kivilo screens them, the agent records the
decision, and the record is kept for five years, ready for a CEA inspection."

Singapore first. Lists, regulator and forms are per-country configuration, so Malaysia
(UN list plus the Home Affairs Domestic List, under AMLA) can follow; v1 only stores a
country field.

## What CEA requires

From the Estate Agents (Prevention of Money Laundering and Financing of Terrorism)
Regulations 2021 and CEA's guide (updated January 2025), which has a section and a
checklist for rental transactions:

- Identify and verify the client (and the beneficial owners of an entity) against reliable
  independent sources, **before the client enters the agreement**.
- Screen the client and beneficial owners against the UN sanctions lists and the First
  Schedule of the Terrorism (Suppression of Financing) Act. A match means a suspicious
  transaction report and no further dealing.
- Check whether the client is a politically exposed person (PEP), with enhanced due
  diligence when the risk is higher.
- Assess and document the money-laundering risk of the transaction.
- Keep the records for at least five years.
- Never tip off a person that they are the subject of a report.

## Who does it

The agent's **client**, which is not always the tenant:

- The agent represents the landlord: the landlord. Kivilo's most common case.
- The agent represents the tenant: the tenant.
- Possibly both, if the July 2025 amendments extend due diligence to an unrepresented
  counterparty (legal check 1).

A co-broking agent on the other side does their own client's due diligence in their own
system.

## Timing: "Start a deal"

Due diligence must finish before the client signs, but today a tenancy only exists once a
check-in starts (`createInspection` is the only place a property and tenancy are made),
usually after the lease is signed. So the compliance pack adds an earlier starting point:

- **Start a deal** creates a due-diligence case owned by the agent, for a client
  (`Stakeholder`), optionally naming the property. It needs no lease dates, rent or deposit.
- When the check-in later creates the tenancy, the agent links the case to it (Kivilo
  suggests a match by property and client).
- An open deal is not an active property and never counts against the free 5-property
  limit (`src/lib/plan.ts`).
- A case can also be started from an existing tenancy, for renewals and deals already
  under way.

## Flows

### The client's particulars (two ways; the agent chooses)

1. **Remote (default).** The agent taps Request particulars. Kivilo emails the client a
   link, which the agent can also send on WhatsApp. The client opens it in a browser, no app
   needed, signs in with the emailed six-digit code as they do to sign a report today (which
   proves the email and links any Kivilo account they already have), fills in the form and
   submits. The page sits outside `(app)`, like `/sign`.
2. **In person.** The agent fills it in on their phone while looking at the client's ID,
   and the client confirms on the same phone, like signing in person today. For clients
   without email, or deals done face to face.

Form fields follow CEA's rental particulars form: legal name as on the ID, ID type and
number, nationality, **date of birth (required: without it common names flood the
review)**, address, PEP declaration. For a company: registration number, registered
address, and each beneficial owner's particulars.

**The client only ever sees "Submitted, thank you."** Screening results, reviews and
escalations are never shown to the client and never appear in any email, notification or
push message the client receives.

### The agent (Flutter app first; web parity later)

1. A deal shows a **Due diligence** card: Not started, Waiting for client, Needs review,
   Complete, Escalated.
2. The agent attests they sighted the ID (in person or by video call). **No ID photos are
   stored in v1** unless the lawyer says copies are required.
3. Screening runs on submission.
   - No match: recorded with the lists' versions and the time.
   - Possible match: the agent reviews each candidate side by side (name, aliases, date of
     birth, nationality, source list) and decides "not the same person" with a reason, or
     "confirmed match".
   - Confirmed sanctions match: the deal is blocked, the agent sees the official reporting
     route, and the agency's owners and managers are notified. The client sees nothing new.
4. Risk assessment: CEA's rental checklist questions, versioned. Higher risk (a PEP, unusual
   payment arrangements, a company with unclear ownership) asks for enhanced details and an
   agency owner's or manager's approval.
5. Complete: the record locks with a content hash, like a signature fingerprint. Changing
   it means reopening with a reason, which creates a new version; old versions stay.
6. Export: one PDF per deal for an inspection.
7. Renewal starts a new case and re-screens automatically.

### The agency (web)

Owners and managers see a simple register of their agency's deals with status, open
reviews and escalations, with a CSV export.

## Data model

New tables with RLS enabled and no client-role privileges, following
`20261026101000_app_tables_server_only`:

- `CddCase`: agent, client (`Stakeholder`), the client's role, optional property, optional
  tenancy (linked later), country, status, risk level, timestamps, content hash, version.
- `CddParticulars`: what was submitted, by whom (client or agent in person), and the
  ID-sighted attestation. The ID number is encrypted at rest and only ever shown masked
  (S****567A).
- `CddBeneficialOwner`: for a company, each owner's particulars, screened like a client.
- `ScreeningRun`: provider, list versions, the exact query, when it ran.
- `ScreeningCandidate`: source list, matched name and aliases, score, details, and the
  agent's decision, reason, decider and time. Never edited after a decision.
- `RiskAssessment`: checklist version, answers, level, approver.
- `SanctionsList`: each version of each list as parsed, with its source, publication date,
  checksum and entries (JSON; about a thousand entries, read whole for every screening).
  A version seen again only has its `fetchedAt` moved on, so the newest row is the list
  last confirmed.
- An append-only audit row for every action on a case.

The unused `Stakeholder.idNumber` stays unused: it is shared across every deal a person is
in, while ID data belongs to each case.

## Day 0: can we get the data and the API? (checked 2026-10-29)

- **UN consolidated list: works.** `https://scsanctions.un.org/resources/xml/en/consolidated.xml`
  returned 200, a 2.2 MB XML generated the night before: 733 individuals and 274 entities,
  2,318 aliases, and a date-of-birth element on 731 of the 733 individuals. Parsed with the
  standard library in seconds.
- **Singapore's own designations: legislation text, small.** MAS's
  [lists page](https://www.mas.gov.sg/regulation/anti-money-laundering/targeted-financial-sanctions/lists-of-designated-individuals-and-entities)
  (updated 27 October 2026) links the UN lists and, for counter-terrorism, "all other
  persons identified in the First Schedule" of the Act on Singapore Statutes Online. There is
  no data feed. OpenSanctions already parses it as `sg_terrorists` ("Singapore Targeted
  Financial Sanctions", 41 entries, updated daily).
- **PEPs for Singapore: covered by OpenSanctions.** `sg_parliament` (276 members of
  Parliament), `sg_gov_dir` (14,498 entries from the Singapore Government Directory) and the
  global Wikidata PEP sets.
- **Other providers.** Dilisense: sanctions, PEPs with relatives and close associates,
  adverse media, EUR 0.10 a call with the first 100 a month free and no monthly fee (vendor
  pricing, confirm at signup). Sumsub: full identity verification (document, liveness, face
  match) plus AML at about US$1.85 a check with a US$299 monthly minimum, too costly now but
  the answer to remote ID checks later. Cynopsis Artemis: a Singapore compliance suite, price
  on request, more competitor or partner than supplier. Singpass MyInfo: government-verified
  identity for residents, needs onboarding approval, a later version.
- **Dilisense tested 30 October 2026** (`GET api.dilisense.com/v1/checkIndividual?names=&dob=`,
  header `x-api-key`), 50 names, name only, against Kivilo's own matcher on the same day's
  lists:
  - PEPs: 20 of 20 found (15 ministers and MPs, 5 reordered or full legal names such as
    "Wong Shyun Tsai Lawrence"). Kivilo has no PEP data, so this is what the provider is for.
  - Sanctions: both found 15 of 15 (5 UN, 5 UN with the name reversed, 5 from the SG First
    Schedule). Dilisense carries the First Schedule as `sg_statutes_online_terrorism_act`.
  - Ordinary names: 12 of 15 clean on both. Dilisense flagged "Rajesh Kumar" (32 records,
    mostly Indian judges and officials), "Ahmad bin Ismail" (1) and "Mohamed Ali" (632);
    Kivilo flagged only "Mohamed Ali" (2). A `dob` drops only records whose own date
    disagrees, so undated records stay ("Mohamed Ali" with a date: 392). The full legal name
    does the work: "Mohamed Ali bin Hassan" with a date returned 2, neither a PEP.
  - Decision: Dilisense for PEPs only. Send the full legal name and date of birth, keep
    `source_type: PEP` records, re-score them with Kivilo's matcher before an agent sees
    them, and keep sanctions on the official lists. OpenSanctions not tested; not needed
    unless Dilisense's terms or price fail legal check 5.

## Screening

- **UN consolidated list:** the official XML above, loaded daily by a cron like the existing
  `/api/internal/*` jobs, matched by Kivilo's own matcher at no cost per check.
- **Singapore First Schedule designations:** either Kivilo curates the short list from the
  legislation text (version, checksum, and a daily check of the MAS page's last-updated
  date), or it uses OpenSanctions' `sg_terrorists` under a commercial data licence. Decide
  after the trial; curating 41 entries is about a day.
- **Matcher:** a pure function with unit tests against real list entries. Normalises case,
  accents, punctuation and word order; compares every alias with a fuzzy score; raises the
  score on a matching birth year or nationality. Tuned to over-flag, because a reviewed
  false positive is cheap and a miss is the liability.
- **PEP:** a provider check (Dilisense first, about EUR 0.10 a check after 100 free a month;
  OpenSanctions as the alternative, commercial licence needed) or the client's declaration
  plus the agent's recorded check, chosen by configuration until legal check 2 settles it.
- **One provider interface,** `screen(person) -> candidates`, so a recognised enterprise
  provider can plug in later for an agency that demands one.

## Authorization and privacy

- Agents reach a case they own, or through `actsAsAgent` or `managedTenancies` once it is
  linked to a tenancy; agency owners and managers reach their agency's cases; a client
  reaches only their own particulars form, by the same own-account rule as `signOwnReport`.
  Every refusal is the same "not found".
- Collecting NRIC is permitted because the law requires the due diligence. ID numbers are
  encrypted in the application (AES-256-GCM, `src/lib/cdd/crypto.ts`) with keys in the
  `CDD_ID_KEYS` environment variable (`v1:<base64 32 bytes>,v2:...`), separate from the
  database. Rotation: append a new key (the last one encrypts), re-encrypt old rows, then
  drop the old key. They are masked everywhere and
  never put in emails, notifications, logs or error reports (extend `redactSecrets`).
  Nothing from a case enters the condition report, its fingerprint or its PDF.
- **Retention:** five years after the business relationship ends. Records survive account
  deletion as a legal obligation (extend the account-deletion fulfilment); a daily job
  purges them once the period ends.
- **The privacy policy and terms change** before launch: NRIC collection, the retention
  after deletion, and Kivilo's role as a tool, not a due-diligence service.

## Gating and plans

- The compliance pack is Pro. Free accounts see the Due diligence card with what Pro does,
  never a dead end.
- Agencies choose whether incomplete due diligence warns or blocks Send for signature.
  Default: warn.

## Clients and API

- Server actions in `src/lib/cdd-actions.ts`; routes under `/api/v1/` as thin delegations;
  the client's particulars page on the web, outside `(app)`.
- Flutter first for agents: Start a deal, the Due diligence card, in-person particulars, the
  review screen. Web agent screens after the app. The agency register is web only.
- Released app builds keep working: additive response fields only.

## Scope of v1

**In:** Start a deal; remote and in-person particulars; individuals and companies with
manually entered beneficial owners; UN and Singapore screening; PEP by configuration;
review; risk checklist; locked record; per-deal PDF; simple agency register with CSV;
re-screening at renewal; Pro gating.

**Out, later:** ID photos (unless required), re-screening when lists change, automated
company-registry lookups, Singpass MyInfo, CEA estate agency agreement forms (after legal
check 6), Malaysia configuration beyond the country field, filing reports for the agent.

## Build order (about 4 to 6 weeks)

| When | Work |
|---|---|
| Days 1 to 2 | A clickable agent flow with sample data, recorded as a 30-second video for the 11 active agents. Continue only if at least 3 agencies want it |
| Week 1 | Data model and migration with RLS, encryption, UN list loading and the curated Singapore list, matcher with tests |
| Week 2 | Start a deal, the client's particulars page, screening runs |
| Week 3 | Flutter agent screens: the Due diligence card, in-person particulars, review |
| Week 4 | Risk checklist, completion lock and hash, per-deal PDF, linking to the tenancy, Pro gating |
| Weeks 5 to 6 | Agency register, renewal re-screening, privacy policy and terms, fixes from the legal review |

Verification: unit tests (matcher, risk rules, masking, encryption), integration tests
(authorization, the own-account rule, no tipping-off in anything the client can read,
retention through account deletion, RLS, the free limit ignoring open deals), an e2e test of
the remote client flow, Flutter tests, and every new screen rendered on a phone before it
ships.

## Must confirm before customers use it

CEA does not approve screening providers; its rules set what the agent must do, and the
agent and agency stay responsible. Kivilo never claims to be "CEA-approved" or to
guarantee compliance.

0. **Ask CEA in writing** whether screening against the UN Consolidated List and the TSOFA
   First Schedule from official sources, PEP checks through the chosen provider, and a
   five-year audit record per transaction satisfy its expectations for rental CDD. A written
   reply is the strongest assurance available.
1. CEA's exact rental particulars and checklist, and whether the July 2025 amendments
   require due diligence on an unrepresented counterparty.
2. Whether a PEP declaration plus a recorded check satisfies CEA, or a PEP database is
   expected.
3. Whether copies of ID documents must be kept, and the NRIC handling, encryption and
   retention after account deletion.
4. The privacy policy and terms: Kivilo supports the agent's own due diligence and never
   guarantees it.
5. The screening provider's terms (Dilisense, or the OpenSanctions commercial licence).
6. For later: whether CEA's prescribed forms may be reproduced in software.

## How we know it worked

- The days 1 to 2 video: at least 3 agencies say they want it.
- Ten paying agencies within eight weeks of launch.
- An agent completes a client's due diligence in under three minutes.
