import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

// Render the social layout directly so it stays independent of page breakpoints.
const artwork = await readFile(new URL('../public/art/tenancy-scenes.webp', import.meta.url))
const output = fileURLToPath(new URL('../public/opengraph-image.png', import.meta.url))
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #fff;
    color: #454541; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    -webkit-font-smoothing: antialiased; }
  .copy { position: absolute; z-index: 1; top: 64px; left: 64px; width: 568px; }
  .wordmark { display: flex; align-items: center; gap: 10px; font-size: 36px; font-weight: 850;
    letter-spacing: -2.5px; line-height: 1; }
  .brand { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 28%; background: #ec4899; }
  .brand::after { content: ''; width: 36%; height: 36%; border-radius: 50%; background: #fff; }
  h1 { margin: 84px 0 26px; font-size: 53px; line-height: 1.12; letter-spacing: -1.7px; font-weight: 700; }
  h1 span { display: block; white-space: nowrap; }
  p { margin: 0; color: #6a6a66; font-size: 24px; line-height: 1.5; }
  .art { position: absolute; right: 0; bottom: 0; width: 550px; height: 570px; overflow: hidden; }
  .art img { display: block; position: absolute; right: 0; bottom: 0; width: 1710px; height: 570px; max-width: none; }
</style></head><body>
  <div class="copy">
    <div class="wordmark"><span class="brand"></span>kivilo</div>
    <h1><span>Hand over the keys.</span><span>Keep the whole story.</span></h1>
    <p>Take a photo. Mark what matters.<br>Get everyone’s signatures.<br>The little details, all in one shared record.</p>
  </div>
  <div class="art"><img src="data:image/webp;base64,${artwork.toString('base64')}" alt="An agent and resident exchanging keys at the doorway."></div>
</body></html>`)
  await page.locator('img').evaluate(image => image.decode())
  await page.screenshot({ path: output })
  console.log(output)
} finally {
  await browser.close()
}
