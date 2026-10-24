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

export function reportAgency<T>(inspection: {
  reportAgentFrozen: boolean
  reportAgency: T | null
  tenancy: { agency: T | null }
}): T | null {
  return inspection.reportAgentFrozen ? inspection.reportAgency : inspection.tenancy.agency
}

type Branding = {
  agencyName: string
  agencyLicence: string | null
  ceaRegistration: string | null
  phone: string | null
  logoPath: string | null
  updatedAt: Date
}

type AgentWithBranding = { branding: Branding | null }
type AgencyWithBranding = {
  name: string
  updatedAt: Date
  branding: Omit<Branding, 'agencyName' | 'ceaRegistration'> | null
}

/// Team properties use the team's shared identity and the responsible agent's personal
/// registration/contact. Personal properties retain that agent's full report branding.
export function reportBranding(inspection: {
  reportAgentFrozen: boolean
  reportAgent: AgentWithBranding | null
  reportAgency: AgencyWithBranding | null
  tenancy: { agent: AgentWithBranding | null; agency: AgencyWithBranding | null }
}): Branding | null {
  const agent = reportAgent(inspection)
  const agency = reportAgency(inspection)
  if (!agency) return agent?.branding ?? null
  const updates = [agency.updatedAt, agency.branding?.updatedAt, agent?.branding?.updatedAt]
    .filter((value): value is Date => Boolean(value))
  return {
    agencyName: agency.name,
    agencyLicence: agency.branding?.agencyLicence ?? null,
    ceaRegistration: agent?.branding?.ceaRegistration ?? null,
    phone: agent?.branding?.phone ?? agency.branding?.phone ?? null,
    logoPath: agency.branding?.logoPath ?? null,
    updatedAt: new Date(Math.max(...updates.map((value) => value.getTime()))),
  }
}
