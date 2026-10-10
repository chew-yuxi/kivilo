import { authed } from '@/lib/api/route'
import { publishAssessment } from '@/lib/assessment-actions'

export const POST = authed(async (_agent, { id }: { id: string }) => publishAssessment(id))
