import { db } from '@/lib/db'
import { toAnnotations } from '@/lib/annotations'
import { authorizeInspection } from '@/lib/auth'
import { createDownloadUrl } from '@/lib/storage'
import { addendumView, currentState } from '@/lib/addenda'

/// Everything the agent works on updates with, for the web panel and the app alike: what
/// is published and who has acknowledged it, the open draft with its photos, the rooms
/// and lines a change can name, and resolved repairs not yet in any update.
export async function addendaWorkspace(inspectionId: string, agentId: string) {
  const inspection = await authorizeInspection(inspectionId, agentId)
  if (inspection.kind !== 'CHECK_IN' || inspection.status !== 'COMPLETED') {
    throw new Error('Only a countersigned check-in can be updated')
  }
  const tenancy = await db.tenancy.findUniqueOrThrow({
    where: { id: inspection.tenancyId },
    include: { landlord: true, tenant: true },
  })
  const addenda = await db.reportAddendum.findMany({
    where: { inspectionId },
    orderBy: [{ number: 'asc' }, { createdAt: 'asc' }],
    include: {
      acknowledgements: true,
      entries: {
        orderBy: { createdAt: 'asc' },
        include: { photos: { orderBy: { createdAt: 'asc' } }, maintenanceCase: { select: { title: true } } },
      },
    },
  })
  const draft = addenda.find((row) => !row.publishedAt)
  const state = await currentState(inspectionId, { acknowledgedOnly: false })
  const inUpdates = addenda.flatMap((row) => row.entries.flatMap((entry) => entry.maintenanceCaseId ?? []))
  const resolvedCases = await db.maintenanceCase.findMany({
    where: { tenancyId: inspection.tenancyId, status: 'RESOLVED', id: { notIn: inUpdates } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true },
  })

  return {
    published: addenda.filter((row) => row.publishedAt).map((row) => {
      const view = addendumView(row, tenancy)
      return {
        id: row.id,
        number: view.number,
        title: view.title,
        effectiveDate: view.effectiveDate,
        acknowledgements: view.acknowledgements,
      }
    }),
    draft: draft
      ? {
          id: draft.id,
          title: draft.title,
          reason: draft.reason,
          effectiveDate: draft.effectiveDate.toISOString().slice(0, 10),
          entries: await Promise.all(draft.entries.map(async (entry) => ({
            id: entry.id,
            change: entry.change,
            roomName: entry.roomName,
            targetKey: entry.targetKey,
            name: entry.name,
            category: entry.category,
            condition: entry.condition,
            quantity: entry.quantity,
            identifier: entry.identifier,
            notes: entry.notes,
            maintenanceCaseTitle: entry.maintenanceCase?.title ?? null,
            photos: await Promise.all(entry.photos.map(async (photo) => ({
              id: photo.id,
              url: await createDownloadUrl(photo.storagePath),
              note: photo.note,
              annotations: toAnnotations(photo.annotations),
              label: photo.label,
            }))),
          }))),
        }
      : null,
    rooms: state.map((room) => room.name),
    targets: state.flatMap((room) => room.lines.map((line) => ({
      key: line.key,
      label: `${room.name} · ${line.name}${line.identifier ? ` (${line.identifier})` : ''}`,
    }))),
    resolvedCases,
  }
}

export type AddendaWorkspace = Awaited<ReturnType<typeof addendaWorkspace>>
