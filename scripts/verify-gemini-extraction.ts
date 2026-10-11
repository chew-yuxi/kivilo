import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { extractRoom } from '../src/lib/inspection/extract'

// Use only synthetic local media. This tests the configured Gemini account and the
// real mixed video/photo extraction call without touching a tenant's inspection.
async function main() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for real extraction')
  }
  const [videoPath, photoPath] = process.argv.slice(2)
  if (!videoPath || !photoPath) {
    throw new Error('Usage: pnpm exec tsx scripts/verify-gemini-extraction.ts synthetic.mp4 synthetic.png')
  }

  const result = await extractRoom({
    roomName: 'Synthetic kitchen',
    kind: 'CHECK_IN',
    propertyLabel: 'Synthetic test unit, Singapore',
    captures: [
      { ref: 'synthetic-video', kind: 'VIDEO', bytes: await readFile(videoPath), mimeType: 'video/mp4', note: null },
      { ref: 'synthetic-photo', kind: 'PHOTO', bytes: await readFile(photoPath), mimeType: 'image/png', note: null },
    ],
  })
  console.log(JSON.stringify({ model: 'gemini-3.1-pro-preview', items: result.items.length }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
