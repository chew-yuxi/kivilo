import type { ResourceArticle } from '../content/types'

// HTML and Markdown use the same editorial content, dates and sources.
export function articleMarkdown(article: ResourceArticle, path: string): string {
  const lines = [
    `# ${article.title}`, '',
    `> ${article.summary}`, '',
    `Canonical page: https://kivilo.app${path}`, '',
    `Published by Kivilo (NotTooSweetLabs Pte. Ltd.). Published: ${article.published}. Updated: ${article.updated}.`, '',
  ]
  if (article.summarySources) {
    lines.push(...article.summarySources.map(source => `- [${source.label}](${source.url})`), '')
  }
  if (article.comparison) {
    lines.push(`Competitor information checked against the linked vendor documentation on ${article.updated}. This is Kivilo’s comparison of documented workflows, not an independent hands-on review. Features and plans can change.`, '')
  }
  lines.push(...article.introduction.flatMap(paragraph => [paragraph, '']))
  if (article.comparison) {
    lines.push('## At a glance', '')
    for (const row of article.comparison.rows) {
      lines.push(`### ${row.topic}`, '', `- Kivilo: ${row.kivilo}`, `- ${article.comparison.competitor}: ${row.competitor}`, `- Source: [${row.source.label}](${row.source.url})`, '')
    }
    lines.push('Kivilo details: [Product facts and limitations](https://kivilo.app/product). An unlisted feature is not evidence that it is unavailable.', '')
  }
  for (const section of article.sections) {
    lines.push(`## ${section.title}`, '', ...section.paragraphs.flatMap(paragraph => [paragraph, '']))
    if (section.bullets) lines.push(...section.bullets.map(bullet => `- ${bullet}`), '')
    if (section.sources) lines.push(...section.sources.map(source => `- Source: [${source.label}](${source.url})`), '')
  }
  if (article.questions.length > 0) {
    lines.push('## Questions and answers', '')
    for (const question of article.questions) lines.push(`### ${question.question}`, '', question.answer, '')
  }
  lines.push('## Related reading', '', ...article.related.map(link => `- [${link.label}](${new URL(link.href, 'https://kivilo.app').href})`), '')
  return lines.join('\n')
}
