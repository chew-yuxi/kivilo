import { product } from '../../content/product'
import { comparisons } from '../../content/comparisons'
import { guides } from '../../content/guides'

export const dynamic = 'force-static'

export function GET() {
  const text = [
    '# Kivilo', '',
    `> ${product.summary}`, '',
    `Product facts reviewed: ${product.updated}. This is Kivilo’s first-party public reference.`, '',
    ...product.introduction.flatMap(paragraph => [paragraph, '']),
    ...product.sections.flatMap(section => [`**${section.title}**`, '', ...section.paragraphs.map(paragraph => `- ${paragraph}`), '']),
    'The links below lead to public product information. Markdown articles contain their canonical HTML URL, publication and update dates, and source links. Comparisons are published by Kivilo using the cited vendors’ documentation; they are not independent reviews or evidence of hands-on testing. Competitor features and plans may change.', '',
    '## Product and evidence', '',
    '- [Kivilo product facts](https://kivilo.app/product/index.md): Product scope, platforms, free allowance, workflow and limitations. Canonical HTML: https://kivilo.app/product.',
    '- [Kivilo overview](https://kivilo.app/): Public walkthrough of capture, inventory, signing, repairs and check-out.',
    '- [Condition report format](https://kivilo.app/reports/property-condition-report.pdf): Illustrative PDF with fictional property details and signatures; not a customer report or a genuine issued report for verification.', '',
    '## Comparisons', '',
    ...comparisons.map(article => `- [${article.title}](https://kivilo.app/compare/${article.slug}/index.md): ${article.description} Checked ${article.updated}.`), '',
    '## Guides for Singapore agents', '',
    ...guides.map(article => `- [${article.title}](https://kivilo.app/guides/${article.slug}/index.md): ${article.description}`), '',
    '## Support and policies', '',
    '- [Support](https://my.kivilo.app/support): Product help and account requests. Contact: hello@nottoosweetlabs.com.',
    '- [Privacy policy](https://my.kivilo.app/privacy): Data handling, access, sharing and retention.',
    '- [Account deletion](https://my.kivilo.app/delete-account): Deletion requests and retention information.',
    '- [Verify an issued report](https://my.kivilo.app/verify): Checks a PDF fingerprint without uploading the PDF. A match verifies the file, not inspection accuracy or legal liability.', '',
    '## Optional', '',
    '- [Full public reference](https://kivilo.app/llms-full.txt): Product facts and all comparison and guide articles in one generated text file, with canonical URLs and source citations.',
    '- [Public sitemap](https://kivilo.app/sitemap.xml): Canonical public marketing pages. Private app and customer report URLs are not included.', '',
  ].join('\n')
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
