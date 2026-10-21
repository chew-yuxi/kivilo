import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

// Dev-only: originals stay outside both the Flutter bundle and public hosting.
// Run from the repository root: pnpm exec tsx scripts/optimize-illustrations.ts
// Keep old hashed files when publishing: installed app versions still use them.
async function main() {
  const output = resolve('public/illustrations')
  await mkdir(output, { recursive: true })
  const scenes = []

  for (const name of ['handover', 'capture', 'inventory', 'sign']) {
    const source = `mobile/design/illustrations/${name}.png`
    const original = await readFile(source)
    const variants = []

    for (const width of [192, 768]) {
      const { data, info } = await sharp(original)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 86, alphaQuality: 100, effort: 6, preset: 'drawing' })
        .toBuffer({ resolveWithObject: true })
      const sha256 = createHash('sha256').update(data).digest('hex')
      const filename = `${name}-${width}-${sha256.slice(0, 12)}.webp`
      await writeFile(resolve(output, filename), data)
      variants.push({ path: `/illustrations/${filename}`, width: info.width, height: info.height, bytes: data.length, sha256 })
    }

    scenes.push({ name, source, sourceBytes: original.length, variants })
  }

  const manifest = {
    format: 'webp',
    quality: 86,
    alphaQuality: 100,
    metadata: 'stripped',
    cacheControl: 'public, max-age=31536000, immutable',
    scenes,
  }
  await writeFile('mobile/design/illustration-assets.json', `${JSON.stringify(manifest, null, 2)}\n`)
  for (const scene of scenes) {
    console.log(`${scene.name}: ${scene.sourceBytes} B original; ${scene.variants.map(v => `${v.width}px ${v.bytes} B`).join(', ')}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
