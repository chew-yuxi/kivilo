import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAgent, inspectionScope, tenancyScope } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import { costStanding, tenancyDetail } from '@/lib/maintenance'
import { StatusBadge } from '@/components/status-badge'
import { RoomCapture, type RoomRow } from '@/components/room-capture'
import { SignaturePad } from '@/components/signature-pad'
import { FindingsPanel, type ComparableItem, type FindingRow } from '@/components/findings-panel'
import { CheckOutButton } from '@/components/check-out-button'
import { DownloadPdf } from '@/components/download-pdf'
import { CompleteReviewButton } from '@/components/complete-review-button'
import { ShareReport } from '@/components/share-report'
import { SigningEmail } from '@/components/signing-email'
import { signingParties } from '@/lib/report-email'
import { AddendaPanel } from '@/components/addenda-panel'
import { addendaWorkspace } from '@/lib/addenda-workspace'
import { inspectionHandover } from '@/lib/handover'
import { TenantHandoverCard } from '@/components/tenant-handover-card'
import { DefectWindowForm } from '@/components/defect-window-form'
import { findingCheckInConditions } from '@/lib/check-in-reference'
import { DepositStatementView } from '@/components/report-document'
import { DepositStatementAnswer } from '@/components/deposit-statement-answer'
import { assessmentSnapshotSchema, depositStatement } from '@/lib/assessment-schema'
import { tenancyAccess } from '@/lib/tenancy-access'
import { TenancyAccessPanel } from '@/components/tenancy-access-panel'
import { TenancyAssignmentPanel } from '@/components/tenancy-assignment-panel'
import { agencyList } from '@/lib/agency'

export const dynamic = 'force-dynamic'

export default async function InspectionPage({ params }: PageProps<'/inspections/[id]'>) {
  const { id } = await params

  const agent = await requireAgent()

  // Scoped rather than found-then-checked, so an inspection belonging to another agent
  // is indistinguishable from one that does not exist.
  const inspection = await db.inspection.findFirst({
    where: { AND: [{ id }, inspectionScope(agent.id)] },
    include: {
      tenancy: { include: { property: true, landlord: true, tenant: true, agent: true } },
      rooms: {
        orderBy: { order: 'asc' },
        // The frozen check-in reference only `check-in-reference.ts` reads.
        omit: { baseline: true },
        include: {
          captures: { orderBy: { createdAt: 'asc' } },
          _count: { select: { items: true } },
        },
      },
      signatures: true,
      checkOut: { where: inspectionScope(agent.id), select: { id: true } },
      baseline: { where: inspectionScope(agent.id), select: { id: true, conductedAt: true } },
      findings: {
        orderBy: { createdAt: 'asc' },
        include: {
          item: { include: { room: { select: { name: true } } } },
          baselineItem: { where: { room: { inspection: inspectionScope(agent.id) } }, include: { room: { select: { name: true } } } },
          maintenanceCase: { where: { tenancy: tenancyScope(agent.id) }, select: { id: true, title: true } },
        },
      },
      assessments: {
        orderBy: { version: 'desc' },
        take: 1,
        include: { responses: { include: { stakeholder: { select: { name: true } } }, orderBy: { respondedAt: 'asc' } } },
      },
    },
  })

  if (!inspection) notFound()

  const { tenancy, status, kind } = inspection
  const access = await tenancyAccess(tenancy.id, agent.id)
  const { agencies } = await agencyList(agent.id)
  const published = inspection.assessments[0]
  const snapshot = published && assessmentSnapshotSchema.parse(published.snapshot)
  const deposit = snapshot && depositStatement(snapshot)
  const statement = deposit && { ...deposit, findingCount: snapshot.findings.length }
  const isCapturePhase = ['DRAFT', 'CAPTURING', 'PROCESSING', 'REVIEW', 'FAILED'].includes(status)

  const rooms: RoomRow[] = inspection.rooms.map((room) => ({
    id: room.id,
    name: room.name,
    status: room.status,
    itemCount: room._count.items,
    videos: room.captures.filter((capture) => capture.kind === 'VIDEO').length,
    photos: room.captures.filter((capture) => capture.kind === 'PHOTO').length,
  }))

  const allReviewed = rooms.length > 0 && rooms.every((room) => room.status === 'REVIEWED')

  const parties = status === 'AWAITING_SIGNATURE' || status === 'COMPLETED'
    ? await signingParties(id)
    : []

  const checkInConditions = kind === 'CHECK_OUT' && inspection.findings.length > 0
    ? await findingCheckInConditions(id, agent.id) : null
  const findings: FindingRow[] = inspection.findings.map((finding) => ({
    id: finding.id,
    changeType: finding.changeType,
    verdict: finding.verdict,
    rationale: finding.rationale,
    estimatedCost: finding.estimatedCost?.toString() ?? null,
    editedByHuman: finding.editedByHuman,
    itemLabel: finding.item ? `${finding.item.room.name} · ${finding.item.name}` : null,
    baselineLabel: inspection.baseline && finding.baselineItem
      ? `${finding.baselineItem.room.name} · ${finding.baselineItem.name}`
      : null,
    baselineCondition: inspection.baseline
      ? checkInConditions?.get(finding.baselineItemId ? `item:${finding.baselineItemId}` : finding.item?.baselineKey ?? '')
        ?? finding.baselineItem?.condition ?? null
      : null,
    currentCondition: finding.item?.condition ?? null,
    maintenanceCaseId: finding.maintenanceCase?.id ?? null,
    maintenanceCaseTitle: finding.maintenanceCase?.title ?? null,
  }))

  // What the add-finding form offers: every item on both signed reports.
  const comparable = async (inspectionId: string | null): Promise<ComparableItem[]> =>
    inspectionId && kind === 'CHECK_OUT' && status === 'COMPLETED'
      ? (
          await db.inspectionItem.findMany({
            where: { room: { inspectionId, inspection: inspectionScope(agent.id) } },
            orderBy: [{ room: { order: 'asc' } }, { createdAt: 'asc' }],
            include: { room: { select: { name: true } } },
          })
        ).map((item) => ({ id: item.id, label: `${item.room.name} · ${item.name}` }))
      : []
  const checkOutItems = await comparable(id)
  const checkInItems = await comparable(inspection.baseline?.id ?? null)

  const maintenanceCases = await db.maintenanceCase.findMany({
    where: { tenancyId: inspection.tenancyId, tenancy: tenancyScope(agent.id) },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, status: true,
      responsibilityProposals: { orderBy: { createdAt: 'asc' }, select: { status: true } },
    },
  })
  const unsettledCosts = maintenanceCases.flatMap((item) => {
    const standing = costStanding(item.status, item.responsibilityProposals)
    return standing && standing !== 'AGREED' ? [{ ...item, standing }] : []
  })

  // Updates since signing, on a countersigned check-in only.
  const signedCheckIn = status === 'COMPLETED' && kind === 'CHECK_IN'
  const addenda = signedCheckIn ? await addendaWorkspace(id, agent.id) : null
  const tenantSigned = inspection.signatures.some((signature) => signature.stakeholderId === tenancy.tenantId)
  const handover = kind === 'CHECK_IN' && tenantSigned ? await inspectionHandover(id, agent.id) : null
  let defectWindow = null
  if (kind === 'CHECK_IN' && !tenantSigned) {
    try {
      const detail = await tenancyDetail(tenancy.id, agent.id)
      if (detail.moveInDefects.canEditWindow) defectWindow = detail.moveInDefects
    } catch (error) {
      // Historical inspection access can outlast active tenancy management access.
      // The domain decides whether the defect period can still be changed.
      if (!(error instanceof Error && error.message === 'Tenancy not found')) throw error
    }
  }

  // Where the inspection stands and the one thing to do next, under the header, so the
  // agent does not have to scroll a signed report's full inventory to find it.
  const itemCount = inspection.rooms.reduce((sum, room) => sum + room._count.items, 0)
  const signedCount = parties.filter((party) => party.signedAt).length
  const answers = published?.responses ?? []
  const nextStep =
    status === 'AWAITING_SIGNATURE'
      ? {
          title: `Collecting signatures: ${signedCount} of ${parties.length} signed`,
          body: 'Hand the phone to each party to sign, or they can sign from the emailed link.',
          links: [{ href: '#signatures', label: 'Go to signatures' }],
        }
      : status === 'COMPLETED' && kind === 'CHECK_IN'
        ? {
            title: 'Signed by both parties',
            body: 'Send both parties the report. At the end of the tenancy, the check-out starts from here.',
            links: [
              { href: '#send', label: 'Send the report' },
              ...(inspection.checkOut
                ? [{ href: `/inspections/${inspection.checkOut.id}`, label: 'Open the check-out' }]
                : access.scope === 'TENANCY' ? [{ href: '#check-out', label: 'Start the check-out' }] : []),
            ],
          }
        : status === 'COMPLETED' && kind === 'CHECK_OUT'
          ? statement
            ? {
                title: `Deposit statement: ${answers.filter((row) => row.answer === 'AGREED').length} agreed, ${
                  answers.filter((row) => row.answer === 'DISPUTED').length} disputed, ${2 - answers.length} waiting`,
                body: 'Each party answers from their own account or on this phone.',
                links: [{ href: '#comparison', label: 'Go to the statement' }],
              }
            : {
                title: 'Signed by both parties',
                body: 'Record what changed against the check-in, then publish the assessment so both parties can answer the deposit statement.',
                links: [{ href: '#comparison', label: 'Go to the comparison' }],
              }
          : null

  return (
    <div className="space-y-8">
      <div>
        <Link href="/inspections" className="text-link inline-flex min-h-11 items-center text-sm">
          ← All inspections
        </Link>
        <div className="mt-3 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {kind === 'CHECK_IN' ? 'Check-in' : 'Check-out'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {propertyLabel(tenancy.property)} · {tenancy.tenant.name}
            </p>
            {inspection.baseline && (
              <p className="mt-1 text-sm text-gray-500">
                Rooms copied from, and compared against,{' '}
                <Link
                  href={`/inspections/${inspection.baseline.id}`}
                  className="text-link"
                >
                  the check-in
                </Link>
                {inspection.baseline.conductedAt &&
                  ` of ${inspection.baseline.conductedAt.toLocaleDateString('en-SG', { dateStyle: 'long' })}`}
                .
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3">
            <StatusBadge status={status} />
            <Link href={`/properties/${tenancy.propertyId}/settings`} className="action-secondary">Property settings</Link>
          </div>
        </div>
        {inspection.summary && (
          <p className="mt-4 max-w-3xl rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            {inspection.summary}
          </p>
        )}
      </div>

      <TenancyAccessPanel access={access} viewerId={agent.id} />
      <TenancyAssignmentPanel key={`${tenancy.id}-${access.agency?.id ?? 'personal'}-${access.leadAgent?.id}`} access={access} agencies={agencies} />

      {nextStep && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-sm font-medium text-gray-900">{nextStep.title}</p>
          <p className="mt-0.5 text-sm text-gray-600">{nextStep.body}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {nextStep.links.map((link) => (
              <a key={link.href} href={link.href} className="action-secondary">
                {link.label} →
              </a>
            ))}
          </div>
        </div>
      )}

      {isCapturePhase && (
        <>
          <RoomCapture inspectionId={id} rooms={rooms} />
          {allReviewed && <CompleteReviewButton inspectionId={id} roomCount={rooms.length} />}
        </>
      )}

      {defectWindow && (
        <DefectWindowForm tenancyId={tenancy.id} inspectionId={id} windowDays={defectWindow.windowDays} deadline={defectWindow.deadline} />
      )}

      {handover && <TenantHandoverCard handover={handover} tenantName={tenancy.tenant.name} tenantEmail={tenancy.tenant.email} />}

      {(status === 'AWAITING_SIGNATURE' || status === 'COMPLETED') && (
        <>
          {/* Read through with both parties before they sign, so open then; afterwards
              it is the record, and folded so what is left to do is in reach. */}
          <details open={status === 'AWAITING_SIGNATURE'} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
              <span>
                <span className="font-medium">Agreed inventory</span>
                <span className="text-gray-500">
                  {' '}· {inspection.rooms.length} {inspection.rooms.length === 1 ? 'room' : 'rooms'},{' '}
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
              </span>
              <span className="text-xs font-medium text-brand-600 group-open:hidden">Show</span>
              <span className="hidden text-xs font-medium text-brand-600 group-open:inline">Hide</span>
            </summary>
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
              {inspection.rooms.map((room) => (
                <AgreedRoom key={room.id} roomId={room.id} name={room.name} />
              ))}
            </div>
          </details>

          <section id="signatures" className="scroll-mt-4 space-y-3">
            <h2 className="text-sm font-medium">Signatures</h2>
            {status === 'AWAITING_SIGNATURE' && (
              <p className="text-sm text-gray-500">
                Go through the inventory above with both parties, then hand the phone to
                each of them to sign. A party with an email on file is also sent a link to
                sign from their own phone. The report freezes once both have.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {parties.map((party) => (
                <div key={party.stakeholderId}>
                  <SignaturePad
                    inspectionId={id}
                    stakeholderId={party.stakeholderId}
                    stakeholderName={party.name}
                    role={party.role === 'LANDLORD' ? 'landlord' : 'tenant'}
                    signedAt={party.signedAt}
                  />
                  {!party.signedAt && (
                    <SigningEmail
                      inspectionId={id}
                      stakeholderId={party.stakeholderId}
                      email={party.email}
                      signingEmail={party.signingEmail}
                      canSend={status === 'AWAITING_SIGNATURE'}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {status === 'COMPLETED' && (
        <div id="send" className="scroll-mt-4 space-y-8">
          <ShareReport inspectionId={id} shareToken={inspection.shareToken} />
          <DownloadPdf inspectionId={id} />
        </div>
      )}

      {addenda && <AddendaPanel inspectionId={id} {...addenda} />}

      {status === 'COMPLETED' && kind === 'CHECK_IN' && (access.scope === 'TENANCY' || inspection.checkOut) && (
        <div id="check-out" className="scroll-mt-4">
          <CheckOutButton baselineId={id} existingCheckOutId={inspection.checkOut?.id ?? null} />
        </div>
      )}

      {kind === 'CHECK_OUT' && status === 'COMPLETED' && (
        <section id="comparison" className="scroll-mt-4 space-y-3">
          <h2 className="text-sm font-medium">Comparison against check-in</h2>
          {unsettledCosts.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="font-medium text-amber-900">
                {unsettledCosts.length === 1
                  ? '1 repair during this tenancy has no agreed cost'
                  : `${unsettledCosts.length} repairs during this tenancy have no agreed cost`}
              </p>
              <p className="mt-1 text-amber-800">
                Settle who pays in the Kivilo app before the deposit is decided, or link
                the repair to a finding below so the decision is made there.
              </p>
              <ul className="mt-3 space-y-1">
                {unsettledCosts.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <span className="text-gray-900">{item.title}</span>
                    <span className="shrink-0 text-amber-800">{standingLabel[item.standing]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <FindingsPanel
            inspectionId={id}
            findings={findings}
            depositAmount={tenancy.deposit.toString()}
            publishedVersion={inspection.assessments[0]?.version ?? null}
            maintenanceCases={maintenanceCases}
            checkOutItems={checkOutItems}
            checkInItems={checkInItems}
          />
          {published && statement && (
            <div className="space-y-3">
              <DepositStatementView
                statement={statement}
                findingCount={statement.findingCount}
                responses={published.responses}
                tenancy={tenancy}
              />
              {[
                { id: tenancy.landlordId, name: tenancy.landlord.name, role: 'Landlord' },
                { id: tenancy.tenantId, name: tenancy.tenant.name, role: 'Tenant' },
              ]
                .filter((party) => !published.responses.some((response) => response.stakeholderId === party.id))
                .map((party) => (
                  <DepositStatementAnswer
                    key={party.id}
                    inspectionId={id}
                    version={published.version}
                    inPerson={{ stakeholderId: party.id, name: party.name, role: party.role }}
                  />
                ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

const standingLabel = {
  PENDING: 'Waiting for an answer',
  DISPUTED: 'Disputed',
  NOT_PROPOSED: 'Nobody has proposed',
}

async function AgreedRoom({ roomId, name }: { roomId: string; name: string }) {
  const items = await db.inspectionItem.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <h3 className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 first:border-t-0">
        {name}
      </h3>
      {items.map((item) => (
        // Stacked on a phone, one row from sm up, same as the review editor.
        <div
          key={item.id}
          className="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-gray-100 px-4 py-2.5 text-sm sm:grid-cols-12 sm:items-baseline"
        >
          <span className="sm:col-span-4">
            <span className="font-medium">{item.name}</span>
            {item.identifier && (
              <span className="mt-0.5 block break-all font-mono text-xs text-gray-500">
                {item.identifier}
              </span>
            )}
          </span>
          <span className="text-xs text-gray-500 sm:col-span-2">{item.condition}</span>
          <span className="text-gray-600 sm:col-span-6">
            {item.meterReading ? `Reading: ${item.meterReading}` : item.notes}
          </span>
        </div>
      ))}
    </div>
  )
}
