import { join } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { TextContent } from 'pdfjs-dist/types/src/display/api'

export type AgreementClauseCandidate = { page: number; text: string; suggestedTenantCap: string | null }
export type AgreementAnalysis = {
  status: 'TEXT' | 'NO_TEXT' | 'UNREADABLE' | 'TOO_LONG'
  candidates: AgreementClauseCandidate[]
}

const MAX_PAGES = 80
const MAX_TEXT = 500_000
const MAX_CANDIDATES = 16
const MAX_EXCERPT = 4000

// This finds passages to read, not contractual obligations. In particular, a
// threshold below which a tenant pays the bill is not a contribution to every bill.
function suggestedCap(text: string): string | null {
  if (!/\b(?:each|every|per)\s+(?:(?:minor|individual|single)\s+)?(?:repair|item|occasion)\b/i.test(text)) return null
  if (/\b(?:USD|AUD|CAD|NZD|HKD|MYR|EUR|GBP|CHF|JPY|THB|INR|CNY|RMB|IDR|KRW|US\s*dollars?|ringgit|pounds?|euros?)\b|(?:US|HK|A|RM)\$/i.test(text)) return null
  const amounts = [...text.matchAll(/(?:S\s*\$|SGD\s*\$?|\$)\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?![\d.,])/gi)]
  if (amounts.length !== 1) return null
  const afterAmount = text.slice(amounts[0].index + amounts[0][0].length)
  if (/^\s*(?:[-–—]|to)\s*(?:(?:S\s*\$|SGD\s*\$?|\$)\s*)?\d/i.test(afterAmount)) return null
  const payment = /\btenant(?:s)?\s+(?:(?:shall|will|must|is\s+to)\s+)?(?:pay|bear|contribute|be\s+responsible\s+for)\s+(?:the\s+)?(?:first|up\s+to)\s*(?:S\s*\$|SGD\s*\$?|\$)/i
  if (!payment.test(text)) return null
  // An explicit 'first' contribution is clear enough to suggest for confirmation.
  // 'Up to' alone often describes a threshold, so also require the excess allocation.
  const first = /\b(?:pay|bear|contribute|be\s+responsible\s+for)\s+(?:the\s+)?first\s*(?:S\s*\$|SGD\s*\$?|\$)/i.test(text)
  if (!first && !/\b(?:landlord\b[^.!?]{0,90}\b(?:excess|balance|remainder)|(?:excess|balance|remainder)\b[^.!?]{0,90}\blandlord)\b/i.test(text)) return null
  if (/\b(?:if|provided|unless|except|notwithstanding|not|never)\b/i.test(text)) return null
  const amount = Number(amounts[0][1].replaceAll(',', ''))
  return amount > 0 && amount <= 99999999.99 ? amount.toFixed(2) : null
}

export function agreementClauseCandidates(pages: string[]): AgreementClauseCandidate[] {
  const candidates: AgreementClauseCandidate[] = []
  for (const [index, page] of pages.entries()) {
    const text = page.replace(/\s+/g, ' ').trim()
    // Keep the adjacent sentences: exclusions and who pays the excess commonly
    // follow the sentence containing 'minor repairs'. Never silently summarize them.
    const sentences = text.split(/(?<=[.!?;])\s+(?=[A-Z(\d])/)
    const ranges: { start: number; end: number }[] = []
    sentences.forEach((sentence, position) => {
      if (!/\b(?:repairs?|maintenance|maintain|servicing|fair\s+wear\s+and\s+tear)\b/i.test(sentence)) return
      const start = Math.max(0, position - 1)
      const end = Math.min(sentences.length, position + 2)
      const last = ranges.at(-1)
      if (last && start <= last.end) last.end = end
      else ranges.push({ start, end })
    })
    for (const range of ranges) {
      const excerpt = sentences.slice(range.start, range.end).join(' ')
      // Long passages are shown with explicit ellipses; never suggest an amount
      // from a truncated passage which may have lost its conditions.
      if (excerpt.length > MAX_EXCERPT) {
        const keyword = excerpt.search(/\b(?:repairs?|maintenance|maintain|servicing)\b/i)
        const start = Math.max(0, keyword - 500)
        candidates.push({ page: index + 1, text: `${start ? '… ' : ''}${excerpt.slice(start, start + MAX_EXCERPT - 4)} …`, suggestedTenantCap: null })
      } else if (excerpt) {
        candidates.push({ page: index + 1, text: excerpt, suggestedTenantCap: suggestedCap(excerpt) })
      }
      if (candidates.length === MAX_CANDIDATES) return candidates
    }
  }
  return candidates
}

/// Runs only on the authenticated server, from bytes already in private storage.
/// No document content goes to an external extraction or AI service.
export async function analyzeAgreementPdf(bytes: Uint8Array): Promise<AgreementAnalysis> {
  const task = getDocument({
    data: new Uint8Array(bytes),
    standardFontDataUrl: join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/'),
    cMapUrl: join(process.cwd(), 'node_modules/pdfjs-dist/cmaps/'),
    cMapPacked: true,
    useWorkerFetch: false,
    useWasm: false,
    enableXfa: false,
    stopAtErrors: true,
    verbosity: 0,
  })
  let expired = false
  const timer = setTimeout(() => { expired = true; void task.destroy() }, 15_000)
  try {
    const pdf = await task.promise
    if (pdf.numPages > MAX_PAGES) return { status: 'TOO_LONG', candidates: [] }
    const pages: string[] = []
    let characters = 0
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number)
      const reader = page.streamTextContent().getReader() as ReadableStreamDefaultReader<TextContent>
      const parts: string[] = []
      try {
        for (;;) {
          const chunk = await reader.read()
          if (chunk.done) break
          for (const item of chunk.value.items) {
            if (!('str' in item)) continue
            characters += item.str.length
            if (characters > MAX_TEXT) {
              await reader.cancel()
              return { status: 'TOO_LONG', candidates: [] }
            }
            parts.push(item.str)
          }
        }
      } finally {
        reader.releaseLock()
      }
      pages.push(parts.join(' ').trim())
      page.cleanup()
    }
    if (pages.every((page) => !page.trim())) return { status: 'NO_TEXT', candidates: [] }
    return { status: 'TEXT', candidates: agreementClauseCandidates(pages) }
  } catch (error) {
    if (expired) return { status: 'TOO_LONG', candidates: [] }
    if (error instanceof Error && ['InvalidPDFException', 'PasswordException', 'UnknownErrorException', 'FormatError'].includes(error.name)) {
      return { status: 'UNREADABLE', candidates: [] }
    }
    throw error
  } finally {
    clearTimeout(timer)
    await task.destroy()
  }
}
