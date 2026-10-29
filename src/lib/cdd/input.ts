import { z } from 'zod'

/// Particulars as on an individual's ID, from the client's form or the agent in person.
/// Companies and their beneficial owners come later (plans/compliance-pack.md).
export const individualParticulars = z.object({
  legalName: z.string().max(200),
  idType: z.enum(['NRIC', 'FIN', 'PASSPORT']),
  idNumber: z.string().max(40),
  nationality: z.string().max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter the date of birth'),
  address: z.string().max(500),
  pepDeclared: z.boolean(),
  pepDetails: z.string().max(1000).nullable().optional(),
})

export const startDealInput = z.object({
  clientName: z.string().max(200),
  clientEmail: z.string().email().max(320).nullable().optional(),
  clientRole: z.enum(['LANDLORD', 'TENANT']),
  tenancyId: z.string().min(1).nullable().optional(),
  agencyId: z.string().min(1).nullable().optional(),
}).strict()

export const decisionInput = z.object({
  decision: z.enum(['NOT_A_MATCH', 'CONFIRMED_MATCH']),
  reason: z.string().max(2000),
}).strict()
