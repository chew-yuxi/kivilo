import { describe, expect, it } from 'vitest'
import { reportBranding } from '@/lib/report-agent'

const at = (day: number) => new Date(`2026-10-${String(day).padStart(2, '0')}T00:00:00Z`)
const personal = {
  agencyName: 'Personal Realty', agencyLicence: 'L-PERSONAL',
  ceaRegistration: 'R061234B', phone: '9000 0000', logoPath: 'personal/logo', updatedAt: at(20),
}
const team = {
  name: 'Harbour Team', updatedAt: at(21),
  branding: { agencyLicence: 'L-TEAM', phone: '6000 0000', logoPath: 'team/logo', updatedAt: at(22) },
}

describe('report branding scope', () => {
  it('combines team identity with the responsible agent identity', () => {
    expect(reportBranding({
      reportAgentFrozen: false,
      reportAgent: null,
      reportAgency: null,
      tenancy: { agent: { branding: personal }, agency: team },
    })).toEqual({
      agencyName: 'Harbour Team', agencyLicence: 'L-TEAM',
      ceaRegistration: 'R061234B', phone: '9000 0000', logoPath: 'team/logo', updatedAt: at(22),
    })
  })

  it('uses the frozen team and agent after Send', () => {
    const frozen = { ...team, name: 'Original Team' }
    expect(reportBranding({
      reportAgentFrozen: true,
      reportAgent: { branding: personal },
      reportAgency: frozen,
      tenancy: { agent: null, agency: { ...team, name: 'New Team' } },
    })?.agencyName).toBe('Original Team')
  })

  it('retains full personal branding outside a team', () => {
    expect(reportBranding({
      reportAgentFrozen: false,
      reportAgent: null,
      reportAgency: null,
      tenancy: { agent: { branding: personal }, agency: null },
    })).toBe(personal)
  })
})
