import { copyFile, mkdir } from 'node:fs/promises'

// Copy only public brand assets. The static site never receives app data or secrets.
const illustrations = [
  'handover-768-ea8147d471c4.webp',
  'capture-768-7282a81449e3.webp',
  'inventory-768-4a57537a634d.webp',
  'sign-768-8d977bcfeef9.webp',
]
await mkdir('marketing/public/illustrations', { recursive: true })
for (const file of illustrations) {
  await copyFile(`public/illustrations/${file}`, `marketing/public/illustrations/${file}`)
}
await copyFile('public/icon-512.png', 'marketing/public/icon-512.png')
await copyFile('src/app/favicon.ico', 'marketing/app/favicon.ico')
