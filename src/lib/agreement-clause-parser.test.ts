import { describe, expect, it } from 'vitest'
import { agreementClauseCandidates, analyzeAgreementPdf } from './agreement-clause-parser'

function textPdf(lines: string[]) {
  const content = `BT /F1 12 Tf 40 700 Td ${lines.map((line, index) => `${index ? '0 -20 Td ' : ''}(${line.replace(/[\\()]/g, '\\$&')}) Tj`).join('\n')} ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Uint8Array(Buffer.from(pdf))
}

describe('agreement clause reader', () => {
  it('keeps source pages and adjacent exceptions, without treating them as confirmed terms', () => {
    const clauses = agreementClauseCandidates([
      'Tenancy starts on 1 January. Rent is due monthly.',
      'Minor repairs. The tenant shall pay the first S$150 for each repair. Fair wear and tear is excluded.',
    ])
    expect(clauses).toEqual([{
      page: 2,
      text: 'Minor repairs. The tenant shall pay the first S$150 for each repair. Fair wear and tear is excluded.',
      suggestedTenantCap: '150.00',
    }])
  })

  it('suggests an explicit per-repair contribution only', () => {
    expect(agreementClauseCandidates(['The tenant shall pay up to SGD 250 per repair. The landlord bears the excess.'])[0].suggestedTenantCap).toBe('250.00')
    expect(agreementClauseCandidates(['The tenant will bear the first S$1,250.50 for each repair.'])[0].suggestedTenantCap).toBe('1250.50')
  })

  it.each([
    'The tenant pays for repairs costing up to S$150. The landlord pays the whole cost above that threshold.',
    'The tenant shall pay up to S$150 for each repair.',
    'The tenant shall pay the first S$150 per repair if the repair costs less than S$500.',
    'The tenant shall pay the first S$150 per repair unless this concerns structural damage.',
    'The tenant shall pay the first S$150 per month for maintenance.',
    'The tenant shall pay the first US$150 for each repair.',
    'The tenant shall pay the first $150 in USD for each repair.',
    'The tenant shall pay the first $150 (CAD) for each repair.',
    'The landlord shall pay the first S$150 for each repair.',
    'The tenant shall not pay the first S$150 for each repair.',
    'The tenant shall pay the first S$150,50 for each repair.',
    'The tenant shall pay the first S$150-200 for each repair.',
    'The tenant shall pay the first S$150 to 200 for each repair.',
    'The tenant shall pay the first S$150 per repair. The landlord will not pay the balance.',
  ])('leaves ambiguous/conditional/foreign currency terms for a person: %s', (clause) => {
    expect(agreementClauseCandidates([clause])[0].suggestedTenantCap).toBeNull()
  })

  it('limits oversized excerpts without suggesting an amount from truncated text', () => {
    const text = `The tenant shall pay the first S$150 per repair ${'subject to the agreement '.repeat(250)}`
    const candidate = agreementClauseCandidates([text])[0]
    expect(candidate.text.length).toBeLessThanOrEqual(4000)
    expect(candidate.text).toContain('…')
    expect(candidate.suggestedTenantCap).toBeNull()
  })

  it('reads a real PDF text stream and returns its source page', async () => {
    const result = await analyzeAgreementPdf(textPdf([
      'Tenancy agreement - minor repairs',
      'The tenant shall pay the first S$150 for each repair.',
      'The landlord shall pay the balance.',
    ]))
    expect(result.status).toBe('TEXT')
    expect(result.candidates[0]).toMatchObject({ page: 1, suggestedTenantCap: '150.00' })
    expect(result.candidates[0].text).toContain('landlord shall pay the balance')
  })

  it('distinguishes image-only/blank PDFs from text with no maintenance clause', async () => {
    expect(await analyzeAgreementPdf(textPdf([]))).toEqual({ status: 'NO_TEXT', candidates: [] })
    expect(await analyzeAgreementPdf(textPdf(['Rent is due monthly.']))).toEqual({ status: 'TEXT', candidates: [] })
  })

  it('keeps a malformed original available for manual reading', async () => {
    expect(await analyzeAgreementPdf(new TextEncoder().encode('%PDF-1.4\nnot a document'))).toEqual({ status: 'UNREADABLE', candidates: [] })
  })
})
