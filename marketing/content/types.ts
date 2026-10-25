export type ArticleSource = {
  label: string
  url: string
}

export type ResourceArticle = {
  slug: string
  title: string
  description: string
  published: string
  updated: string
  summary: string
  summarySources?: ArticleSource[]
  introduction: string[]
  comparison?: {
    competitor: string
    rows: {
      topic: string
      kivilo: string
      competitor: string
      source: ArticleSource
    }[]
  }
  sections: {
    id: string
    title: string
    paragraphs: string[]
    bullets?: string[]
    sources?: ArticleSource[]
  }[]
  questions: { question: string; answer: string }[]
  related: { label: string; href: string }[]
}
