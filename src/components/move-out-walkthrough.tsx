'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { attachMoveOutPhotos, enqueue, listPending } from '@/lib/offline-queue'
import { useUploadQueue } from '@/components/upload-queue'
import type { MoveOutVisit } from '@/lib/move-out'
import type { moveOutTargets } from '@/lib/move-out-tenancies'
import type { Country } from '@/generated/prisma'

type Issue = MoveOutVisit['issues'][number]
type Draft = {
  id: string
  reportId?: string
  visitedAt?: string
  address: string
  tenancyId: string
  issues: Issue[]
  editing: Issue | null
  step: 'address' | 'walk' | 'details'
  details: Record<string, string>
}
const emptyIssue = (): Issue => ({ id: crypto.randomUUID(), label: '', change: 'DAMAGE', note: '' })
const input = 'block w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-base'
async function post(actorId: string, path: string, body: unknown) {
  const result = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-kivilo-owner': actorId },
    body: JSON.stringify(body),
  })
  const json = await result.json()
  if (!result.ok)
    throw new Error(
      json.message ||
        (json.error === 'plan_limit'
          ? 'Your workspace has reached its property limit.'
          : 'Could not save. Check the details and try again.'),
    )
  return json.id as string
}

export function MoveOutWalkthrough({
  agentId,
  agencyId,
  country,
  workspace,
  targets,
}: {
  agentId: string
  agencyId: string | null
  country: Country
  workspace: string
  targets: Awaited<ReturnType<typeof moveOutTargets>>
}) {
  const router = useRouter()
  const queue = useUploadQueue()
  const key = `kivilo-move-out:${agentId}:${agencyId ?? 'personal'}`
  const last = useRef<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    try {
      last.current = localStorage.getItem(key)
      setDraft(
        last.current
          ? JSON.parse(last.current)
          : {
              id: crypto.randomUUID(),
              address: '',
              tenancyId: '',
              issues: [],
              editing: null,
              step: 'address',
              details: {},
            },
      )
    } catch {
      setError('This device could not open its saved walkthrough.')
    }
  }, [key])
  function save(next: Draft) {
    if (localStorage.getItem(key) !== last.current) {
      setError('This visit changed in another tab. Reload to see the saved version.')
      return false
    }
    try {
      const json = JSON.stringify(next)
      localStorage.setItem(key, json)
      last.current = json
      setDraft(next)
      setError('')
      return true
    } catch {
      setError('Could not save this change on the device. Free some space and retry.')
      return false
    }
  }
  async function run(work: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await work()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the visit.')
    } finally {
      setBusy(false)
    }
  }
  if (!draft) return <p role="status">{error || 'Opening your walkthrough…'}</p>
  const d = draft
  const stage = `move-out-draft:${d.id}`
  const target = targets.find((t) => t.id === d.tenancyId)
  const edit = d.editing
  const photos = queue.pending.filter((p) => p.inspectionId === stage)
  const detail = (name: string, label: string, type = 'text', required = true) => (
    <label>
      {label}
      <input
        className={input}
        type={type}
        required={required}
        value={d.details[name] ?? ''}
        onChange={(e) => save({ ...d, details: { ...d.details, [name]: e.target.value } })}
      />
    </label>
  )
  async function finish() {
    const moveOut = {
      visitedAt: d.visitedAt,
      issues: d.issues,
      noIssues: !d.issues.length,
      photoIds: (await listPending()).filter((p) => p.inspectionId === stage).map((p) => p.clientId!),
    }
    const id =
      d.reportId ??
      (d.tenancyId
        ? await post(agentId, '/api/v1/move-out', { clientId: d.id, tenancyId: d.tenancyId, moveOut })
        : await post(agentId, '/api/v1/inspections', {
            ...d.details,
            line1: d.address,
            country,
            propertyType: d.details.propertyType || 'PRIVATE_NON_LANDED',
            landlordEmail: d.details.landlordEmail || null,
            tenantEmail: d.details.tenantEmail || null,
            monthlyRent: '',
            deposit: d.details.deposit || '',
            preservesBlankAmounts: true,
            ...(agencyId && { agencyId }),
            clientId: d.id,
            moveOut,
          }))
    if (!d.reportId && !save({ ...d, reportId: id })) return
    await attachMoveOutPhotos(stage, id)
    queue.flush()
    localStorage.removeItem(key)
    router.push(`/inspections/${id}`)
  }
  if (d.reportId)
    return (
      <main className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold">Check-out saved</h1>
        <p>Finish attaching the photos saved on this device.</p>
        {error && <p role="alert">{error}</p>}
        <button className="action-primary" disabled={busy} onClick={() => void run(finish)}>
          Continue to report
        </button>
      </main>
    )
  return (
    <main className="mx-auto max-w-lg space-y-5">
      <p className="text-sm text-gray-600">{workspace} · Check-out</p>
      <h1 className="text-2xl font-semibold">
        {d.step === 'address'
          ? 'Start check-out'
          : d.step === 'details'
            ? 'Review walkthrough'
            : 'Move-out walkthrough'}
      </h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <fieldset disabled={busy} className="space-y-4">
        {d.step === 'address' ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void run(async () => {
                if (target?.checkOutId || target?.baselineId) {
                  const id =
                    target.checkOutId ??
                    (await post(agentId, `/api/v1/inspections/${target.baselineId}/checkout`, {}))
                  localStorage.removeItem(key)
                  router.push(`/inspections/${id}`)
                  return
                }
                save({
                  ...d,
                  step: 'walk',
                  visitedAt: new Date().toISOString(),
                  address: target?.address ?? d.address.trim(),
                })
              })
            }}
          >
            {targets.length > 0 && (
              <label className="block">
                Tenancy
                <select
                  className={input}
                  value={d.tenancyId}
                  onChange={(e) => save({ ...d, tenancyId: e.target.value })}
                >
                  <option value="">New address</option>
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.address} · {t.tenant} · ends {t.end}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!d.tenancyId && (
              <label className="block">
                Property address and unit
                <input
                  className={input}
                  required
                  value={d.address}
                  onChange={(e) => save({ ...d, address: e.target.value })}
                />
              </label>
            )}
            <p className="text-sm text-gray-600">
              {target?.checkOutId
                ? 'The existing check-out will open.'
                : target?.baselineId
                  ? 'The signed check-in is available for this visit.'
                  : 'You can start with a paper check-in or no previous record.'}
            </p>
            <button className="action-primary" disabled={!d.tenancyId && !d.address.trim()}>
              {target?.checkOutId ? 'Open check-out' : 'Start walkthrough'}
            </button>
          </form>
        ) : (
          <>
            <p className="font-medium">{d.address}</p>
            {d.issues.length > 0 && (
              <ul className="divide-y rounded-lg border border-gray-200 px-4">
                {d.issues.map((i) => (
                  <li key={i.id} className="py-3">
                    <strong>{i.label}</strong>
                    <p>{i.note}</p>
                    <small>
                      {i.change === 'MISSING' ? 'Missing' : i.change === 'WEAR' ? 'Wear' : 'Damage'} ·{' '}
                      {photos.filter((p) => p.itemId === i.id).length} photos
                    </small>
                    {d.step === 'walk' && !edit && (
                      <button className="text-link ml-3" onClick={() => save({ ...d, editing: i })}>
                        Edit
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {d.step === 'walk' ? (
              edit ? (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    save({
                      ...d,
                      editing: null,
                      issues: [
                        ...d.issues.filter((i) => i.id !== edit.id),
                        { ...edit, label: edit.label.trim() },
                      ],
                    })
                  }}
                >
                  <label className="block">
                    What did you find?
                    <input
                      autoFocus
                      required
                      maxLength={160}
                      className={input}
                      placeholder="Living room · air-con remote missing"
                      value={edit.label}
                      onChange={(e) => save({ ...d, editing: { ...edit, label: e.target.value } })}
                    />
                  </label>
                  <label className="block">
                    Type
                    <select
                      aria-label="Type"
                      className={input}
                      value={edit.change}
                      onChange={(e) =>
                        save({ ...d, editing: { ...edit, change: e.target.value as Issue['change'] } })
                      }
                    >
                      <option value="DAMAGE">Damage</option>
                      <option value="MISSING">Missing item</option>
                      <option value="WEAR">Wear</option>
                    </select>
                  </label>
                  <label className="block">
                    Evidence note (optional)
                    <textarea
                      className={input}
                      maxLength={1000}
                      value={edit.note}
                      onChange={(e) => save({ ...d, editing: { ...edit, note: e.target.value } })}
                    />
                  </label>
                  <label className="block">
                    Add photos
                    <input
                      className={input}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? [])
                        e.target.value = ''
                        void run(async () => {
                          if (files.some(file => !/\.(jpe?g|png|webp)$/i.test(file.name))) {
                            throw new Error('Choose a JPEG, PNG or WebP photo.')
                          }
                          for (const file of files)
                            await enqueue({
                              inspectionId: stage,
                              roomId: stage,
                              itemId: edit.id,
                              kind: 'PHOTO',
                              clientId: crypto.randomUUID(),
                              filename: file.name,
                              mimeType: file.type,
                              blob: file,
                              durationSec: null,
                              note: null,
                              annotations: null,
                              createdAt: Date.now(),
                            })
                        })
                      }}
                    />
                  </label>
                  <p className="text-sm">
                    {photos.filter((p) => p.itemId === edit.id).length}{' '}
                    {photos.filter((p) => p.itemId === edit.id).length === 1 ? 'photo' : 'photos'} saved on
                    this device
                  </p>
                  <button className="action-primary" disabled={!edit.label.trim()}>
                    Save issue
                  </button>
                  {!photos.some((p) => p.itemId === edit.id) && (
                    <button
                      type="button"
                      className="action-secondary ml-2"
                      onClick={() => save({ ...d, editing: null })}
                    >
                      Cancel
                    </button>
                  )}
                </form>
              ) : (
                <div className="space-y-3">
                  <p>Record damage or missing items as you walk. Costs can be entered later.</p>
                  <button className="action-primary" onClick={() => save({ ...d, editing: emptyIssue() })}>
                    Record an issue
                  </button>
                  <button className="action-secondary ml-2" onClick={() => save({ ...d, step: 'details' })}>
                    {d.issues.length ? 'Review visit' : 'Finish with no issues'}
                  </button>
                  <p className="text-sm text-gray-600">Walkthrough saved on this device.</p>
                </div>
              )
            ) : (
              <form
                className="grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  void run(finish)
                }}
              >
                {!d.issues.length && <p>No issues observed during this visit.</p>}
                {!d.tenancyId && (
                  <>
                    <h2 className="font-semibold">Tenancy details for the report</h2>
                    {detail('postalCode', 'Postal code')}
                    <label>
                      Property type
                      <select
                        className={input}
                        value={d.details.propertyType || 'PRIVATE_NON_LANDED'}
                        onChange={(e) =>
                          save({ ...d, details: { ...d.details, propertyType: e.target.value } })
                        }
                      >
                        <option value="PRIVATE_NON_LANDED">Private apartment</option>
                        {country === 'SG' && <option value="HDB">HDB</option>}
                        <option value="LANDED">Landed</option>
                        <option value="COMMERCIAL">Commercial</option>
                      </select>
                    </label>
                    {detail('landlordName', 'Landlord name')}
                    {detail('tenantName', 'Tenant name')}
                    {detail('landlordEmail', 'Landlord email (optional)', 'email', false)}
                    {detail('tenantEmail', 'Tenant email (optional)', 'email', false)}
                    {detail('startDate', 'Tenancy start', 'date')}
                    {detail('endDate', 'Tenancy end', 'date')}
                    {detail(
                      'deposit',
                      `Deposit (${country === 'MY' ? 'MYR' : 'SGD'}, optional)`,
                      'text',
                      false,
                    )}
                  </>
                )}
                <button className="action-primary">{busy ? 'Saving…' : 'Create check-out report'}</button>
                <button
                  className="action-secondary"
                  type="button"
                  onClick={() => save({ ...d, step: 'walk' })}
                >
                  Back to walkthrough
                </button>
              </form>
            )}
          </>
        )}
      </fieldset>
    </main>
  )
}
