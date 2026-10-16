'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CATEGORIES, CONDITIONS } from '@/lib/inspection/schema'
import {
  addAddendumEntry,
  addendumFromMaintenanceCase,
  deleteAddendumEntry,
  deleteAddendumPhoto,
  publishAddendum,
  registerAddendumPhoto,
  requestAddendumPhotoUpload,
  startAddendum,
  updateAddendum,
  updateAddendumEntry,
} from '@/lib/addendum-actions'
import type { AcknowledgementStatus } from '@/lib/addenda'
import type { AddendumChange, ItemCategory, ItemCondition } from '@/generated/prisma'

export type PublishedRow = {
  id: string
  number: number
  title: string
  effectiveDate: string
  acknowledgements: AcknowledgementStatus[]
}

export type EntryRow = {
  id: string
  change: AddendumChange
  roomName: string
  targetKey: string | null
  name: string | null
  category: ItemCategory | null
  condition: ItemCondition | null
  quantity: number
  identifier: string | null
  notes: string | null
  maintenanceCaseTitle: string | null
  photos: { id: string; url: string; note: string | null; label: string | null }[]
}

export type DraftRow = {
  id: string
  title: string
  reason: string | null
  effectiveDate: string
  entries: EntryRow[]
}

/// A line of the report as it stands after every published update, which is what a
/// replacement or removal can name.
export type TargetOption = { key: string; label: string }

const CHANGE_LABEL: Record<AddendumChange, string> = {
  ADDED: 'Added',
  REPLACED: 'Replaced',
  REMOVED: 'Removed',
}

const field = 'w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none'

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/// Updates since signing, on a countersigned check-in: what has been published and who
/// has acknowledged it, the draft the agent is writing, and resolved repairs that can
/// start one. The signed report itself is never edited here.
export function AddendaPanel({
  inspectionId,
  published,
  draft,
  rooms,
  targets,
  resolvedCases,
}: {
  inspectionId: string
  published: PublishedRow[]
  draft: DraftRow | null
  rooms: string[]
  targets: TargetOption[]
  resolvedCases: { id: string; title: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (work: () => Promise<unknown>) => startTransition(async () => {
    setError(null)
    try {
      await work()
    } catch (e) {
      setError(message(e))
    }
  })

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Updates since signing</h2>
      <p className="text-sm text-gray-500">
        Record a change after signing, such as a replaced appliance, as a dated update. The
        signed report stays as it was; the update is added after the signatures and counts
        once the landlord and tenant have both acknowledged it.
      </p>

      {published.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {published.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
              <a href={`/updates/${row.id}`} className="font-medium text-brand-700 hover:underline">
                Update {row.number}: {row.title}
              </a>
              <span className="text-xs text-gray-500">
                {row.acknowledgements.map((ack) =>
                  `${ack.role} ${ack.acknowledgedAt ? 'acknowledged' : 'pending'}`).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <DraftEditor draft={draft} rooms={rooms} targets={targets} />
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => startAddendum(inspectionId))}
          className="rounded-md border border-gray-300 px-3.5 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Start an update
        </button>
      )}

      {resolvedCases.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium">Resolved repairs</h3>
          <ul className="mt-2 space-y-2">
            {resolvedCases.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{item.title}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => addendumFromMaintenanceCase(item.id))}
                  className="shrink-0 rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Add to the report as an update
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </section>
  )
}

function DraftEditor({ draft, rooms, targets }: { draft: DraftRow; rooms: string[]; targets: TargetOption[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (work: () => Promise<unknown>) => startTransition(async () => {
    setError(null)
    try {
      await work()
    } catch (e) {
      setError(message(e))
    }
  })

  return (
    <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          run(() => updateAddendum(draft.id, {
            title: String(data.get('title')),
            reason: String(data.get('reason')) || null,
            effectiveDate: String(data.get('effectiveDate')),
          }))
        }}
        className="space-y-2"
      >
        <h3 className="text-sm font-medium">Draft update</h3>
        <label className="block text-xs font-medium text-gray-600">
          Title
          <input name="title" defaultValue={draft.title} required className={field} />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Reason
          <textarea name="reason" defaultValue={draft.reason ?? ''} rows={2} className={field} />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Date of the change
          <input name="effectiveDate" type="date" defaultValue={draft.effectiveDate} required className={field} />
        </label>
        <button type="submit" disabled={pending} className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">
          Save details
        </button>
      </form>

      {draft.entries.map((entry) => (
        <div key={entry.id} className="rounded border border-gray-200 bg-white p-3">
          {entry.maintenanceCaseTitle && (
            <p className="mb-2 text-xs text-gray-500">From the repair: {entry.maintenanceCaseTitle}</p>
          )}
          <EntryForm
            addendumId={draft.id}
            entry={entry}
            rooms={rooms}
            targets={targets}
          />
          <Photos addendumId={draft.id} entry={entry} />
        </div>
      ))}

      <div className="rounded border border-dashed border-gray-300 bg-white p-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Add a change</h4>
        <EntryForm addendumId={draft.id} entry={null} rooms={rooms} targets={targets} />
      </div>

      <div className="border-t border-amber-200 pt-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm('Publish this update? It cannot be changed afterwards, and the landlord and tenant are asked to acknowledge it.')) return
            run(() => publishAddendum(draft.id))
          }}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {pending ? 'Working…' : 'Publish update'}
        </button>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  )
}

/// One change, new or saved. A replacement or removal names the line it changes; the
/// room then follows that line, so only an added line asks for one.
function EntryForm({
  addendumId,
  entry,
  rooms,
  targets,
}: {
  addendumId: string
  entry: EntryRow | null
  rooms: string[]
  targets: TargetOption[]
}) {
  const [change, setChange] = useState<AddendumChange>(entry?.change ?? 'ADDED')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const prefix = entry ? `entry-${entry.id}` : 'new-entry'

  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form)
    const text = (name: string) => String(data.get(name) ?? '').trim() || null
    const input = {
      change,
      roomName: text('roomName') ?? '',
      targetKey: change === 'ADDED' ? null : text('targetKey'),
      name: text('name'),
      category: text('category'),
      condition: text('condition'),
      quantity: Number(data.get('quantity') ?? 1) || 1,
      identifier: text('identifier'),
      notes: text('notes'),
    }
    startTransition(async () => {
      setError(null)
      try {
        if (entry) {
          await updateAddendumEntry(entry.id, addendumId, input)
        } else {
          await addAddendumEntry(addendumId, input)
          form.reset()
          setChange('ADDED')
        }
      } catch (e) {
        setError(message(e))
      }
    })
  }

  return (
    <form
      aria-label={entry ? `Change: ${CHANGE_LABEL[entry.change]} ${entry.name ?? ''}`.trim() : 'New change'}
      onSubmit={(e) => {
        e.preventDefault()
        submit(e.currentTarget)
      }}
      className="space-y-2"
    >
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Change"
          value={change}
          onChange={(e) => setChange(e.target.value as AddendumChange)}
          className="rounded border border-gray-200 px-2 py-1.5 text-sm"
        >
          {(Object.keys(CHANGE_LABEL) as AddendumChange[]).map((value) => (
            <option key={value} value={value}>{CHANGE_LABEL[value]}</option>
          ))}
        </select>
        {change === 'ADDED' ? (
          <>
            <input
              name="roomName"
              aria-label="Room"
              list={`${prefix}-rooms`}
              defaultValue={entry?.roomName ?? ''}
              placeholder="Room"
              required
              className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm"
            />
            <datalist id={`${prefix}-rooms`}>
              {rooms.map((room) => <option key={room} value={room} />)}
            </datalist>
          </>
        ) : (
          <select
            name="targetKey"
            aria-label="Item it changes"
            defaultValue={entry?.targetKey ?? ''}
            required
            className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm"
          >
            <option value="" disabled>Which item?</option>
            {targets.map((target) => <option key={target.key} value={target.key}>{target.label}</option>)}
          </select>
        )}
      </div>

      {change !== 'REMOVED' && (
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="name" aria-label="New item" placeholder="New item, e.g. Dishwasher" defaultValue={entry?.name ?? ''} required className={field} />
          <input name="identifier" aria-label="Make, model and serial" placeholder="Make, model and serial" defaultValue={entry?.identifier ?? ''} className={`${field} font-mono`} />
          <select name="category" aria-label="Category" defaultValue={entry?.category ?? 'APPLIANCE'} className={field}>
            {CATEGORIES.map((value) => <option key={value} value={value}>{value.toLowerCase()}</option>)}
          </select>
          <div className="flex gap-2">
            <select name="condition" aria-label="Condition" defaultValue={entry?.condition ?? 'NEW'} className={field}>
              {CONDITIONS.map((value) => <option key={value} value={value}>{value.toLowerCase()}</option>)}
            </select>
            <input name="quantity" aria-label="Quantity" type="number" min={1} defaultValue={entry?.quantity ?? 1} className={`${field} w-20`} />
          </div>
        </div>
      )}
      <textarea name="notes" aria-label="Notes" placeholder="Notes" defaultValue={entry?.notes ?? ''} rows={2} className={field} />

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">
          {entry ? 'Save change' : 'Add change'}
        </button>
        {entry && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => {
              try {
                await deleteAddendumEntry(entry.id, addendumId)
              } catch (e) {
                setError(message(e))
              }
            })}
            className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  )
}

const storage = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  ).storage.from('captures')

/// Photos for one change, from whoever supplied them. Each goes straight from this
/// browser to storage on a one-shot signed URL, then is registered once it is there.
function Photos({ addendumId, entry }: { addendumId: string; entry: EntryRow }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const upload = (files: File[]) => startTransition(async () => {
    setError(null)
    try {
      for (const file of files) {
        const input = { clientId: crypto.randomUUID(), mimeType: file.type }
        const { storagePath, signedUrl, token } = await requestAddendumPhotoUpload(entry.id, addendumId, input)
        if (signedUrl && token) {
          const { error: uploadError } = await storage().uploadToSignedUrl(storagePath, token, file, { contentType: file.type })
          if (uploadError) throw uploadError
        }
        await registerAddendumPhoto(entry.id, addendumId, { ...input, storagePath, sizeBytes: file.size, note: null })
      }
    } catch (e) {
      setError(message(e))
    }
  })

  return (
    <div className="mt-3">
      {entry.photos.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2">
          {entry.photos.map((photo) => (
            <figure key={photo.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.note ?? photo.label ?? 'Update photo'} className="h-24 w-full rounded border border-gray-200 object-contain" />
              <figcaption className="flex items-center justify-between text-xs text-gray-500">
                <span>{photo.label ?? ''}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(async () => {
                    try {
                      await deleteAddendumPhoto(photo.id, addendumId)
                    } catch (e) {
                      setError(message(e))
                    }
                  })}
                  className="text-gray-400 hover:text-red-600"
                >
                  Remove
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <label className="inline-block cursor-pointer text-xs font-medium text-brand-700 hover:underline">
        {pending ? 'Uploading…' : 'Add photos'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={pending}
          aria-label={`Photos for ${entry.name ?? entry.roomName}`}
          onChange={(e) => {
            // Copied out first: clearing the input empties its live FileList.
            const files = Array.from(e.currentTarget.files ?? [])
            e.currentTarget.value = ''
            if (files.length > 0) upload(files)
          }}
          className="sr-only"
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
