import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { requireAgent, authorizeInspection } from '@/lib/auth'
import { mintRenderToken } from '@/lib/render-token'
import { createDownloadUrl, uploadBytes } from '@/lib/storage'

/// Prints the shared report page itself, so the PDF can never drift from the link:
/// photos, marks, signatures and the evidence footer are the same render. Locally
/// CHROMIUM_PATH points at Playwright's Chromium; on Vercel the serverless build is used.
async function printReport(origin: string, inspectionId: string) {
  const local = process.env.CHROMIUM_PATH
  const browser = await puppeteer.launch({
    executablePath: local ?? await chromium.executablePath(),
    args: local ? [] : chromium.args,
    headless: true,
  })
  try {
    const page = await browser.newPage()
    const response = await page.goto(`${origin}/reports/${mintRenderToken(inspectionId)}`, {
      waitUntil: 'networkidle0',
      timeout: 45_000,
    })
    if (!response?.ok()) throw new Error(`Report page answered ${response?.status()}`)
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
    })
  } finally {
    await browser.close()
  }
}

/// A signed report only: before both signatures a PDF is a document someone could
/// mistake for the agreed one. The file goes to private storage and the caller gets a
/// short-lived link, because a photo-heavy PDF is far past the function response cap.
export async function reportPdfUrl(inspectionId: string, origin: string) {
  const agent = await requireAgent()
  const inspection = await authorizeInspection(inspectionId, agent.id)
  if (inspection.status !== 'COMPLETED') {
    throw new Error('Only a countersigned report can be downloaded as a PDF')
  }
  const path = `reports/${inspectionId}.pdf`
  await uploadBytes(path, await printReport(origin, inspectionId), 'application/pdf')
  return { url: await createDownloadUrl(path, 10 * 60) }
}
