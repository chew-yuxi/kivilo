import { z } from 'zod'

export const SUPPORTING_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024
export const SUPPORTING_DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const

export const supportingDocumentRequestInput = z.object({
  clientId: z.string().uuid(),
  title: z.string().trim().min(1).max(120).default('Supporting document'),
}).strict()

export const supportingDocumentUploadInput = z.object({
  clientId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(180).regex(/^[^\x00-\x1f\x7f/\\]+$/),
  mimeType: z.enum(SUPPORTING_DOCUMENT_MIME_TYPES),
  byteSize: z.number().int().positive().max(SUPPORTING_DOCUMENT_MAX_BYTES),
}).strict()

export type SupportingDocumentUploadInput = z.infer<typeof supportingDocumentUploadInput>
export type SupportingDocumentPerson = { id: string; name: string }
export type SupportingDocumentFileView = {
  id: string
  clientId: string
  fileName: string
  mimeType: string
  byteSize: number
  submittedAt: string
  submittedBy: SupportingDocumentPerson
}

const agreementTermsFields = z.object({
  fileId: z.string().min(1),
  page: z.number().int().min(1).max(10000),
  quote: z.string().trim().min(1).max(12000),
  rule: z.enum(['FIRST_AMOUNT', 'OTHER']),
  tenantCap: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/).nullable(),
  notes: z.string().trim().max(2000).nullable().default(null),
})

export const agreementTermsInput = agreementTermsFields.strict().superRefine((input, context) => {
  if ((input.rule === 'FIRST_AMOUNT') !== (input.tenantCap !== null)) {
    context.addIssue({ code: 'custom', path: ['tenantCap'], message: 'Only a first-amount contribution has a fixed tenant contribution.' })
  }
  if (input.rule === 'OTHER' && !input.notes) {
    context.addIssue({ code: 'custom', path: ['notes'], message: 'Describe the rule and any exceptions from the agreement.' })
  }
})

export const confirmedAgreementTermsSchema = agreementTermsFields.extend({
  confirmedAt: z.iso.datetime(),
  confirmedBy: z.object({ id: z.string(), name: z.string() }),
})

export type AgreementTerms = z.infer<typeof confirmedAgreementTermsSchema> & { sourceFileName: string | null }
export type AgreementAnalysis = {
  fileId: string
  status: 'TEXT' | 'NO_TEXT' | 'UNREADABLE' | 'TOO_LONG'
  candidates: { page: number; text: string; suggestedTenantCap: string | null }[]
}
export type MaintenanceTermsView = AgreementTerms & { matchesCurrentAgreement: boolean }

export type SupportingDocumentsWorkspace = {
  tenancyId: string
  propertyLabel: string
  tenantName: string
  startDate: string
  endDate: string
  role: 'agent' | 'tenant' | 'landlord'
  canRequest: boolean
  canUpload: boolean
  currentMinorRepairCap: string | null
  agreement: {
    requestId: string | null
    files: SupportingDocumentFileView[]
    currentFileId: string | null
    canUpload: boolean
    canReview: boolean
    terms: AgreementTerms | null
    termsMatchCurrentFile: boolean
  }
  requests: {
    id: string
    title: string
    requestedAt: string
    requestedBy: SupportingDocumentPerson
    canUpload: boolean
    files: SupportingDocumentFileView[]
  }[]
}
