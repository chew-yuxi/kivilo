import { FREE_ACTIVE_PROPERTIES } from '../../src/lib/plan-limits'
import type { ResourceArticle } from './types'

export const product: ResourceArticle = {
  slug: 'product',
  title: 'Kivilo product facts: rental handovers and tenancy records',
  description: 'What Kivilo does, who it is for, supported platforms, the free plan, report signatures, offline capture and check-out assessments.',
  published: '2026-10-25',
  updated: '2026-10-25',
  summary: 'Kivilo is a property handover and tenancy record app built in Singapore for rental agents, agencies, landlords and tenants. It connects room inventories, photo and video evidence, signatures, repairs and check-out assessments in one property record.',
  introduction: ['This is Kivilo’s own product reference, maintained by Kivilo. It describes the available workflow and its limits. The public website is kivilo.app; the signed-in web app is my.kivilo.app. Kivilo is operated by NotTooSweetLabs Pte. Ltd. in Singapore.'],
  sections: [
    {
      id: 'availability', title: 'Platforms and the free plan',
      paragraphs: [
        'Kivilo is available in a browser as an installable web app and on Android through Google Play. The native iPhone app is coming soon; there is no public App Store download linked here yet. iPhone users can use the web app.',
        `The free plan includes ${FREE_ACTIVE_PROPERTIES} active properties with no credit card required. This is a property allowance, not a limit of ${FREE_ACTIVE_PROPERTIES} reports. For larger portfolios, contact support for current plan availability and pricing.`,
      ],
      sources: [{ label: 'Android app on Google Play', url: 'https://play.google.com/store/apps/details?id=one.kivilo.kivilo' }, { label: 'Kivilo support', url: 'https://my.kivilo.app/support' }],
    },
    {
      id: 'check-in', title: 'Check-in: evidence, inventory and signatures',
      paragraphs: [
        'Inspectors capture room photos and narrated walkthrough videos, write and edit the inventory, link photos to individual lines, and review each room. Circles, arrows and freehand marks are stored separately from the original photograph.',
        'Sending the report for signature freezes its inventory and agreed photos. The landlord and tenant can sign on the agent’s device or through their own account after signing in with an emailed code. Completed reports can be downloaded as a PDF and shared through a private, revocable link. Signed PDF delivery uses email attachments, or an authenticated download link for larger reports.',
        'Kivilo does not use AI to write inventories, interpret condition, or decide damage liability. The inspector writes the description and assessment.',
      ],
    },
    {
      id: 'poor-signal', title: 'What works with poor signal',
      paragraphs: [
        'Captured photos and videos are saved on the device first and queued for upload. Failed uploads are retained and retried when a connection is available. Keep the app and its saved data on the device until uploads finish.',
        'This is durable media capture, not a promise that every workflow works offline. Sending a report and collecting signatures need a connection.',
      ],
    },
    {
      id: 'tenancy', title: 'During the tenancy',
      paragraphs: [
        'Repairs, supporting documents and dated updates stay with the tenancy record. A signed check-in is preserved; replacements, additions and removals are recorded in separate addenda. An addendum becomes part of the agreed check-out baseline only after both parties acknowledge it.',
        'Agents and agencies can explicitly share working access. Landlords and tenants use their own tenancy views. A published report link is a private credential that can be revoked, not a public listing.',
      ],
    },
    {
      id: 'check-out', title: 'Check-out and the deposit statement',
      paragraphs: [
        'A check-out starts from the signed check-in and acknowledged updates. The inspector reviews the original inventory and agreed linked photos, records what changed, and explains an assessment of damage or fair wear.',
        'Publishing an assessment creates a dated version. Its deposit statement records the deposit less the tenant-liable findings. The landlord and tenant can agree or dispute that version with a reason. The statement and responses are available on the web and PDF; the native app does not yet display the deposit statement.',
        'Kivilo records the assessment and the parties’ responses. It does not hold or transfer deposits, adjudicate disputes, or guarantee a legal outcome.',
      ],
    },
    {
      id: 'privacy-verification', title: 'Private records and PDF verification',
      paragraphs: [
        'Customer property records, supporting documents and signing pages are private working content. The public marketing pages and articles contain no customer tenancy data.',
        'The public report verifier checks whether a PDF matches a file issued by Kivilo. The browser computes the file’s fingerprint and submits that fingerprint; the PDF itself is not uploaded. A match confirms the file, not the accuracy of the inspection or a legal judgment.',
      ],
      sources: [{ label: 'Check an issued report PDF', url: 'https://my.kivilo.app/verify' }, { label: 'Privacy policy', url: 'https://my.kivilo.app/privacy' }],
    },
  ],
  questions: [
    { question: 'Is Kivilo an AI inspection app?', answer: 'No. Inspectors write the inventory and their condition assessments. Kivilo keeps their evidence, signatures and tenancy history together.' },
    { question: 'Where can I see the report format?', answer: 'The public website includes an illustrative condition report PDF with fictional details and signatures. It shows the format and is not a customer report or a genuine issued report for the verifier.' },
  ],
  related: [
    { label: 'View the condition report format (PDF)', href: '/reports/property-condition-report.pdf' },
    { label: 'Compare Kivilo with other inspection apps', href: '/compare' },
    { label: 'Rental handover checklist for Singapore agents', href: '/guides/rental-handover-checklist-singapore' },
  ],
}
