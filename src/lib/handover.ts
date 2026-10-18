import QRCode from 'qrcode'
import { db } from '@/lib/db'
import { authorizeReport } from '@/lib/auth'
import { moveInDefectWindow } from '@/lib/move-in-defect-window'

/// A handover link names a report, never a share token. The tenant still has to sign
/// in as the person on the tenancy before anything is shown. No email goes in the QR.
export function handoverUrl(inspectionId: string) {
  const configured = process.env.KIVILO_APP_URL
  if (!configured) throw new Error('KIVILO_APP_URL must be set')
  const origin = new URL(configured)
  if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password) {
    throw new Error('KIVILO_APP_URL must be an HTTP origin')
  }
  return new URL(`/handover/${encodeURIComponent(inspectionId)}`, origin.origin).toString()
}

/// The agent can show this after collecting the tenant's signature; either party can
/// retrieve it through their own report access. A draft, a check-out, an unsigned
/// tenant and somebody else's report have the same refusal.
export async function inspectionHandover(inspectionId: string, stakeholderId: string) {
  await authorizeReport(inspectionId, stakeholderId)
  const inspection = await db.inspection.findFirst({
    where: {
      id: inspectionId,
      kind: 'CHECK_IN',
      status: { in: ['AWAITING_SIGNATURE', 'COMPLETED'] },
    },
    select: {
      tenancyId: true,
      tenancy: { select: { tenantId: true, startDate: true, defectWindowDays: true } },
      signatures: { select: { stakeholderId: true } },
    },
  })
  if (!inspection?.signatures.some((signature) => signature.stakeholderId === inspection.tenancy.tenantId)) {
    throw new Error('Report not found')
  }
  const window = moveInDefectWindow(inspection.tenancy)
  const url = handoverUrl(inspectionId)
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' })
  return {
    tenancyId: inspection.tenancyId,
    url,
    deadline: window.deadline?.toISOString().slice(0, 10) ?? null,
    windowDays: window.windowDays,
    modules: Array.from({ length: modules.size }, (_, y) =>
      Array.from({ length: modules.size }, (_, x) => Boolean(modules.get(y, x)))),
  }
}
