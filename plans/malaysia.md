# Malaysia: a second country

Decided 2026-11-18 (Yuxi: "start now"). Malaysian agents use Kivilo as individuals, on
the app, exactly as Singapore agents do. Each property belongs to one country, its money
is shown in that country's currency, and Singapore-only compliance stays off Malaysian
properties. Opening Malaysia on the stores is a separate, later step (see "Launch").

## The rule

`Property.country` is `SG` or `MY`, chosen when the property is made and never changed.
Its currency follows from it: SGD or MYR. There is no separate currency column and no
per-tenancy currency, so a property's reports, repairs, deposit statement and documents
can never disagree about money.

Every existing row is `SG`. **Singapore output stays byte-identical**: the same text, the
same PDF drawing and, above all, the same hashes. The report fingerprint
(`report-fingerprint.ts`, recomputed live on `/sign`) and the assessment snapshot hash
include the country only when it is not `SG`, so no signed or published Singapore record
changes its hash.

## Where the agent works

Revised 2026-11-18 (Yuxi: country is chosen during onboarding). An agent says once where
they work, and their new properties are made there; there is no per-property choice.

- `Stakeholder.country Country?`, null until answered. Migration
  `20261118100000_stakeholder_country` sets every existing row to `SG`, so every agent from
  before this is Singapore and is never asked. It is the agent's working country only:
  `Property.country` stays the truth for a property's money, address and checks, frozen
  at creation, and changing the agent's country never moves a property.
- `GET /api/v1/me` returns `country` (null when unanswered). `PUT /api/v1/me/country`
  (`setAgentCountry` in `account-actions.ts`, through `requireAgent()`) sets it, records
  nothing else, and answers with the same profile `GET /api/v1/me` does
  (`account-profile.ts`), which the app saves as its copy of `me`.
- The app sends the agent's country with a new property. The server never derives it from
  the agent: an omitted `country` is still `SG`, so installed builds and the web form make
  Singapore properties.
- App: after sign-in, an account with work whose profile says `country: null` sees one
  full-screen step before Home, "Where do you work?", Singapore or Malaysia, preselected
  from the phone's region (`MY` is Malaysia, anything else Singapore), and one Continue
  that saves it. A failed save shows the reason and Try again, and nothing lets them past
  without a saved answer. A profile that could not be read at all (offline, nothing
  saved) does not ask, and a saved answer is kept on the phone, so the step never loops.
  A copy of `me` saved before countries existed has no `country` key and reads as
  Singapore. Account has a "Where you work" row to change it later.
- Agent-level Singapore tools follow the agent's country: Home's client-checks tiles are
  hidden for an agent who works in Malaysia, and the branding field and Account's summary
  name the agent's register ("Your CEA registration (optional)" and "CEA ..." exactly as
  before for Singapore, REN for Malaysia). A report header still follows its property.

## Data

- Migration: `enum Country { SG MY }`, `Property.country Country @default(SG)`. Additive,
  with RLS unchanged (column on an existing table).
- `src/lib/country.ts` is the one place that knows a country: its currency, name
  ("Singapore", "Malaysia"), money formatting (`Intl.NumberFormat` `en-SG`/SGD and
  `en-MY`/MYR), and its registration label for report headers. `format.ts`'s `sgd()`
  becomes `money(amount, country)` in `country.ts`, with `shortMoney` for the sentences
  that always printed a bare "S$150" (repair splits, timeline costs, repair terms), so
  Singapore text stays as it was; `propertyLabel()` names the property's country.
- The fingerprint, the assessment snapshot and the PDF model (the stored copy's cache
  key) all carry `country` only outside Singapore, pinned by
  `singapore-hashes.integration.test.ts`. A Singapore PDF is therefore never redrawn and
  `RENDER_VERSION` does not move.
- `createInspection` and `POST /api/v1/inspections` take an optional `country`
  (default `SG`, so installed builds keep making Singapore properties). `HDB` is refused
  for `MY`, and so is a Malaysian postcode that is not 5 digits, on create and edit (the
  app's form cannot validate a field scrolled out of view). Singapore postal codes stay
  unchecked. Renewals and every later write inherit the property's country.

## Money everywhere it is shown

Server, web and PDF: thread the property's country into every money format listed in
the 2026-11-18 inventory (report page, PDF, findings panel, deposit statement and its
notification, maintenance `describeProposal`, property timeline visit costs, supporting
documents minor-repair cap). Notification bodies already stored keep their text.

API: every response that carries money gains `currency` (`"SGD"`/`"MYR"`) beside it,
additively. Nothing is renamed or removed (released builds cast fields strictly).

App: one `money(amount, currency)` and one currency label/prefix in
`mobile/lib/ui/kivilo_format.dart`, used by every screen in the inventory (report,
inspection, finding editor, new check-in, tenancy details, renewal, tenancy,
agreement terms, responsibility card, maintenance case, supporting documents). Models
read `currency`, defaulting to SGD only because a copy saved on the phone before this
change cannot hold one, and every such copy is Singapore.

Agreement clause parser: takes the country. Singapore behaves exactly as today; for
Malaysia it reads `RM`/`MYR` amounts and rejects S$/SGD.

## Compliance

CEA due diligence is Singapore law. For a Malaysian property:
- New check-in hides "Verify both parties (CEA)"; `verifyTenancyParties` and a deal
  started on the tenancy refuse. `POST /api/v1/inspections` ignores `verifyParties` there,
  as it already ignores it when the allowance has run out, rather than failing after the
  check-in exists.
- The tenancy verification endpoint answers `enabled: false`, and the property overview
  gives each term `verification: null`. Installed builds already show nothing for
  either (they read `enabled` from the operators' preview), so Send-for-signature's
  warning and the property page's party rows disappear on every build.
- The report header uses the registration label for the property's country; the stored
  `AgentBranding.ceaRegistration` is unchanged, and the branding field names the agent's
  own register (see "Where the agent works"). Singapore report text is unchanged.

Home's client-checks tiles are agent-level, so they follow the agent's country.

## Address

New check-in (app) makes a new property in the agent's country, with no choice on the
form; an existing property keeps its own. Malaysia skips the OneMap lookup, takes the street,
area and city in the address line and a 5-digit postcode, and offers condo, landed and
commercial (no HDB). The label reads "{unit}, {line1}, {postcode} Malaysia". The web
form keeps making Singapore properties only (app first); the web still renders
Malaysian reports, signing pages, updates, emails and PDFs correctly, since landlords
and tenants read those there.

Wording tied to time ("end of day in Singapore", "(Singapore time)", the documents
page's "SGT") names the property's country or zone (MYT). Malaysia is UTC+8 too, so the
deadline arithmetic is unchanged.

## Out of scope

Marketing site and guides, store listing copy, Kivilo's own Stripe pricing (SGD only),
Malaysian AML checks, and the unmerged `claude/translations`
branch, which moves the same app labels into ARB files and will need rebasing over this.

## Tests

Integration: a Malaysian check-in end to end (create with `MY`, money in MYR on the API,
report and PDF model, deposit statement, CDD refused, HDB refused) and the Singapore
fingerprint and snapshot hash unchanged for an existing-shaped report. Unit: `country.ts`
formatting, the clause parser for both countries, PDF document with MYR. App: model
parsing with and without `currency` and `country`, money labels, the onboarding step
(shown only when unanswered, saving required), New check-in in the agent's country,
Home's tiles for a Malaysian agent, Singapore labels unchanged. Integration also covers
the backfill and setting and reading the agent's country. Render the changed app screens
(widget screenshots) and check them, per the layout lesson.

## Launch (each step needs Yuxi's go)

1. Deploy the server (migration first), then a Shorebird patch built from a pinned
   worktree.
2. **A new store build before Malaysia opens.** A Shorebird patch applies on the second
   launch, so a new install's first session runs the store build, which would make a
   Malaysian agent's first property a Singapore one.
3. App Store Connect shows an existing Malaysian Personal price of RM129.90 per month (Singapore S$39). On 27 Nov 2026 Google Play had no Malaysian Personal price or new-subscriber availability. The owner decides the Google price before activation.
4. Privacy policy and terms: they name Singapore law, CEA and hosting. Malaysia's PDPA
   2010 and its notice requirements need market-specific review. The commissioner’s [privacy notice guide](https://www.pdp.gov.my/wp-content/uploads/2025/01/A-Quick-Guide-to-PRIVACY-NOTICE.pdf) calls for the national language and English. Wording is Yuxi’s decision.
5. Add Malaysia on both stores, and update the listing copy.
