import { join } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

// From the working directory rather than import.meta: Vitest loads this file as ESM and
// Playwright as CommonJS, and both run from the repo root.
const fonts = join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/')

/// The text of each page of a PDF, whitespace collapsed. For tests: what a reader of
/// the file would actually find on each page, read back with an independent parser.
export async function pdfPageTexts(bytes: Uint8Array): Promise<string[]> {
  const task = getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: fonts })
  const pdf = await task.promise
  const pages: string[] = []
  for (let number = 1; number <= pdf.numPages; number++) {
    const content = await (await pdf.getPage(number)).getTextContent()
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' ').replace(/\s+/g, ' ').trim())
  }
  await task.destroy()
  return pages
}
