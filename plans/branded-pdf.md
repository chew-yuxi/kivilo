# Branded PDF report

Planned 2026-10-13. The gap that matters most against Report and Run: agents email a PDF
with their agency's name and logo on it. Ours is a browser print of the share page with
Kivilo's name at the top.

## Decisions

- **One layout.** The PDF is the existing `/reports/[token]` page printed by headless
  Chromium, not a second layout in a PDF library. Photos, marks (`MarkOverlay`),
  signatures and the assessment already render correctly there, and the evidence footer
  stays word for word. A second layout would drift.
- **Branding belongs to the agent.** Singapore agents are individually registered, and
  a report is prepared by one. A new `AgentBranding` row, one per Stakeholder: agency
  name, agency licence number, CEA registration number, phone, logo. The report shows
  the branding of the agent on the tenancy; with none set, it reads as today. An agency
  sharing one brand across agents is M1's job, when agencies exist as records.
- **Branding shows on the shared link too.** It is printed from that page, and the
  landlord following a link should see who prepared it.
- **Signed reports only.** A PDF exists only once both parties have signed
  (`COMPLETED`). Before that it would be a document someone could mistake for the
  agreed one.

## How the PDF is made

1. The agent asks for it (app button, web link). The server authorizes them with
   `authorizeInspection` and requires `COMPLETED`.
2. The server mints a **render token**: inspection id plus a two-minute expiry, HMAC
   signed with a key derived from the existing service-role secret. The report page
   accepts a share token *or* a valid render token. So a report never shared by link can
   still be printed, without creating a share link nobody asked for.
3. Chromium (`@sparticuz/chromium` with `puppeteer-core` on Vercel, Playwright's
   installed Chromium locally) opens the page, waits for every image, and prints A4
   with the print stylesheet.
4. The PDF goes to private storage at `reports/<inspectionId>.pdf`, overwritten each
   time, and the caller gets a short-lived signed URL. A photo-heavy PDF is far past the
   4.5 MB function response cap, so it never goes back through the function body.

The render token is the one new credential. It is useless without the server secret,
names one inspection, expires in two minutes, and only renders what the share page
would render.

## Build

1. `AgentBranding` model and migration; logo upload through the existing signed-URL
   path into the private bucket; `GET/PUT /api/v1/me/branding`.
2. Branding header on `/reports/[token]`; render-token support there.
3. `POST /api/v1/inspections/[id]/pdf` and a matching server action for the web.
4. App: "Report branding" in Account settings (drawer to edit, logo picker), and a
   "Download PDF" action beside Share on a signed report. Web: a Download PDF link.
5. Tests: render token accepted, expired and forged tokens refused, wrong-agent refused,
   unsigned refused; an end-to-end run that downloads a real PDF and checks its pages.

Production setup: none beyond the deploy. The render key is derived from a secret
production already has, and the migration is additive.
