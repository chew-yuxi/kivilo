import { z } from 'zod'

/// The agent's risk assessment of one client, from CEA's risk factors for estate agents
/// (plans/compliance-pack.md). A yes to any question makes the client higher risk, which
/// needs the source of the client's funds recorded. The version is stored with every
/// assessment, so changing a question never changes what an earlier one meant.
export const RISK_CHECKLIST_VERSION = '2026-10-31'

export const RISK_QUESTIONS = [
  {
    key: 'pep',
    text: 'Is the client, or a family member or close associate, a politically exposed person?',
    help: 'A current or former senior public official in Singapore or elsewhere. Starts from the client’s own declaration.',
  },
  {
    key: 'highRiskCountry',
    text: 'Is the client a national or resident of a country on the FATF black or grey list?',
    help: 'FATF updates the lists in February, June and October. Check the current lists at fatf-gafi.org.',
  },
  {
    key: 'cash',
    text: 'Will any deposit or rent be paid in cash?',
    help: null,
  },
  {
    key: 'actingForAnother',
    text: 'Is someone else acting for the client, or paying on their behalf?',
    help: null,
  },
  {
    key: 'unusual',
    text: 'Is anything about this deal unusual?',
    help: 'For example a rent far from the market, reluctance to give details, or an ID that does not look right.',
  },
] as const

export type RiskKey = (typeof RISK_QUESTIONS)[number]['key']

export const riskAnswersInput = z.object({
  answers: z.object(Object.fromEntries(RISK_QUESTIONS.map((question) => [question.key, z.boolean()])) as Record<RiskKey, z.ZodBoolean>).strict(),
  sourceOfFunds: z.string().max(2000).nullable().optional(),
}).strict()

export function riskLevel(answers: Record<RiskKey, boolean>) {
  return RISK_QUESTIONS.some((question) => answers[question.key]) ? 'HIGHER' : 'STANDARD'
}
