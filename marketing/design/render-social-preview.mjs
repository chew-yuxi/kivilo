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
  .copy { position: absolute; z-index: 1; top: 54px; left: 58px; width: 540px; }
  .wordmark { display: flex; align-items: center; gap: 14px; font-size: 62px; font-weight: 850;
    letter-spacing: -3.5px; line-height: 1; }
  .brand { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 28%; background: #ec4899; }
  .brand::after { content: ''; width: 36%; height: 36%; border-radius: 50%; background: #fff; }
  h1 { margin: 78px 0 0; font-size: 94px; line-height: 1.06; letter-spacing: -3px; font-weight: 700; }
  h1 span { display: block; white-space: nowrap; }
  .backdrop { position: absolute; right: -46px; top: 35px; width: 630px; height: 580px; }
  .art { position: absolute; right: 0; bottom: 0; width: 600px; height: 630px; overflow: hidden; }
  .art img { display: block; position: absolute; right: -155px; bottom: -130px; width: 2460px; height: 820px; max-width: none; }
</style></head><body>
  <div class="copy">
    <div class="wordmark"><span class="brand"></span>kivilo</div>
    <h1><span>Give every</span><span>tenancy</span><span>an upgrade.</span></h1>
  </div>
  <svg class="backdrop" viewBox="0 0 630 580" aria-hidden="true">
    <path fill="#f8e4eb" d="M496 39C595 62 655 168 611 279C574 373 543 495 436 540C327 589 186 560 91 486C-1 415 2 303 38 198C76 86 192 40 305 29C376 21 432 9 496 39Z" />
  </svg>
  <div class="art"><img src="data:image/webp;base64,${artwork.toString('base64')}" alt="An agent and resident exchanging keys at the doorway."></div>
</body></html>`)
  await page.locator('img').evaluate(image => image.decode())
  await page.screenshot({ path: output })
  console.log(output)
} finally {
  await browser.close()
}
