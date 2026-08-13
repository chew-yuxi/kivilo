import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { extractFromCapture } from '../src/lib/inspection/extract'

/// Runs the extraction step against a local video without touching the database.
/// Usage: pnpm exec tsx scripts/try-extract.ts ./walkthrough.mp4
async function main() {
  const file = process.argv[2]
  if (!file) throw new Error('Usage: tsx scripts/try-extract.ts <video-file>')

  const extraction = await extractFromCapture({
    bytes: new Uint8Array(readFileSync(file)),
    mimeType: 'video/mp4',
    kind: 'CHECK_IN',
    propertyLabel: '#28-05, 2 Marina Boulevard, Singapore 018987',
  })

  console.log(JSON.stringify(extraction, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
