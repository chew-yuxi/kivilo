// Operational handover changes who manages the tenancy. A report keeps the agent
// it named when sent, including a deliberately absent agent on an older report.
// The fallback supports reports sent by an older server during a rolling release.
export function reportAgent<T>(inspection: {
  reportAgentFrozen: boolean
  reportAgent: T | null
  tenancy: { agent: T | null }
}): T | null {
  return inspection.reportAgentFrozen ? inspection.reportAgent : inspection.tenancy.agent
}
