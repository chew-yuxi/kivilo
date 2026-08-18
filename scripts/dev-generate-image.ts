import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { generateImage } from '../src/lib/based-ai'

/// Dev-only: generates one image through Based AI and writes it to disk.
/// Usage: tsx scripts/dev-generate-image.ts "<prompt>" [out.png] [model]
async function main() {
  const [prompt, out = 'generated.png', model] = process.argv.slice(2)
  if (!prompt) throw new Error('Usage: tsx scripts/dev-generate-image.ts "<prompt>" [out.png] [model]')
  const image = await generateImage(prompt, { model })
  writeFileSync(out, image.bytes)
  console.log(`wrote ${out} (${image.bytes.byteLength} bytes, ${image.mimeType})`)
  if (image.revisedPrompt) console.log(`revised prompt: ${image.revisedPrompt}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
