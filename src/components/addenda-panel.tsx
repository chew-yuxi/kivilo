'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CATEGORIES, CONDITIONS } from '@/lib/inspection/schema'
import {
  addAddendumEntry,
  addendumFromMaintenanceCase,
  deleteAddendumEntry,
  deleteAddendumPhoto,
  discardAddendum,
  publishAddendum,
  registerAddendumPhoto,
  requestAddendumPhotoUpload,
  startAddendum,
  updateAddendum,
  updateAddendumEntry,
} from '@/lib/addendum-actions'
import { downscale } from '@/lib/downscale'
import type { AddendaWorkspace } from '@/lib/addenda-workspace'
import type { AddendumChange } from '@/generated/prisma'
import { usePwa } from '@/components/locale'

type DraftRow = NonNullable<AddendaWorkspace['draft']>
type EntryRow = DraftRow['entries'][number]

/// A line of the report as it stands after every published update, which is what a
/// replacement or removal can name.
type TargetOption = AddendaWorkspace['targets'][number]

/// What storage accepts for an update photo. Anything else (an iPhone's HEIC) is
/// re-encoded as JPEG in this browser first.
const STORED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const CHANGES: AddendumChange[] = ['ADDED', 'REPLACED', 'REMOVED']

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
}: AddendaWorkspace & { inspectionId: string }) {
  const w = usePwa()
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
      <h2 className="text-sm font-medium">{w.updatesSinceSigning}</h2>
      <p className="text-sm text-gray-500">
        {w.updatesIntro}
      </p>

      {published.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {published.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
              <a href={`/updates/${row.id}`} className="text-link font-medium">
                {w.updateTitle(row.number, row.title)}
              </a>
              <span className="text-xs text-gray-500">
                {row.acknowledgements.map((ack) =>
                  w.ackStatus(ack.role, Boolean(ack.acknowledgedAt), ack.inPerson)).join(' · ')}
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
          {w.startUpdate}
        </button>
      )}

      {resolvedCases.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium">{w.resolvedRepairs}</h3>
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
                  {w.addAsUpdate}
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
  const w = usePwa()
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
        <h3 className="text-sm font-medium">{w.draftUpdate}</h3>
        <label className="block text-xs font-medium text-gray-600">
          {w.title}
          <input name="title" defaultValue={draft.title} required className={field} />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          {w.reason}
          <textarea name="reason" defaultValue={draft.reason ?? ''} rows={2} className={field} />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          {w.dateOfChange}
          <input name="effectiveDate" type="date" defaultValue={draft.effectiveDate} required className={field} />
        </label>
        <button type="submit" disabled={pending} className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">
          {w.saveDetails}
        </button>
      </form>

      {draft.entries.map((entry) => (
        <div key={entry.id} className="rounded border border-gray-200 bg-white p-3">
          {entry.maintenanceCaseTitle && (
            <p className="mb-2 text-xs text-gray-500">{w.fromRepair(entry.maintenanceCaseTitle)}</p>
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
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{w.addChangeHeading}</h4>
        <EntryForm addendumId={draft.id} entry={null} rooms={rooms} targets={targets} />
      </div>

      <div className="border-t border-amber-200 pt-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(w.publishConfirm)) return
            run(() => publishAddendum(draft.id))
          }}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {pending ? w.working : w.publishUpdate}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(w.discardConfirm)) return
            run(() => discardAddendum(draft.id))
          }}
          className="action-danger ml-3"
        >
          {w.discardDraft}
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
  const w = usePwa()
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
      aria-label={entry ? w.changeAria(w.addendumChange(entry.change), entry.name ?? '').trim() : w.newChange}
      onSubmit={(e) => {
        e.preventDefault()
        submit(e.currentTarget)
      }}
      className="space-y-2"
    >
      <div className="flex flex-wrap gap-2">
        <select
          aria-label={w.change}
          value={change}
          onChange={(e) => setChange(e.target.value as AddendumChange)}
          className="rounded border border-gray-200 px-2 py-1.5 text-sm"
        >
          {CHANGES.map((value) => (
            <option key={value} value={value}>{w.addendumChange(value)}</option>
          ))}
        </select>
        {change === 'ADDED' ? (
          <>
            <input
              name="roomName"
              aria-label={w.room}
              list={`${prefix}-rooms`}
              defaultValue={entry?.roomName ?? ''}
              placeholder={w.room}
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
            aria-label={w.itemItChanges}
            defaultValue={entry?.targetKey ?? ''}
            required
            className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm"
          >
            <option value="" disabled>{w.whichItem}</option>
            {targets.map((target) => <option key={target.key} value={target.key}>{target.label}</option>)}
          </select>
        )}
      </div>

      {change !== 'REMOVED' && (
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="name" aria-label={w.newItem} placeholder={w.newItemHint} defaultValue={entry?.name ?? ''} required className={field} />
          <input name="identifier" aria-label={w.makeModelSerial} placeholder={w.makeModelSerial} defaultValue={entry?.identifier ?? ''} className={`${field} font-mono`} />
          <select name="category" aria-label={w.category} defaultValue={entry?.category ?? 'APPLIANCE'} className={field}>
            {CATEGORIES.map((value) => <option key={value} value={value}>{w.itemCategory(value)}</option>)}
          </select>
          <div className="flex gap-2">
            <select name="condition" aria-label={w.conditionLabel} defaultValue={entry?.condition ?? 'NEW'} className={field}>
              {CONDITIONS.map((value) => <option key={value} value={value}>{w.conditionOption(value)}</option>)}
            </select>
            <input name="quantity" aria-label={w.quantity} type="number" min={1} defaultValue={entry?.quantity ?? 1} className={`${field} w-20`} />
          </div>
        </div>
      )}
      <textarea name="notes" aria-label={w.notes} placeholder={w.notes} defaultValue={entry?.notes ?? ''} rows={2} className={field} />

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">
          {entry ? w.saveChange : w.addChange}
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
            className="action-danger px-3 text-xs"
          >
            {w.remove}
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
  const w = usePwa()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const upload = (files: File[]) => startTransition(async () => {
    setError(null)
    try {
      for (const file of files) {
        // Shrunk as captures are, and re-encoded whatever its size when storage would
        // refuse its format. A HEIC this browser cannot read is refused here, by name.
        const stored = STORED_TYPES.includes(file.type)
        const shrunk = await downscale(file, { always: !stored })
        if (!shrunk && !stored) throw new Error(w.notAPhoto(file.name))
        const photo = shrunk ?? file
        const input = { clientId: crypto.randomUUID(), mimeType: photo.type }
        const { storagePath, signedUrl, token } = await requestAddendumPhotoUpload(entry.id, addendumId, input)
        if (signedUrl && token) {
          const { error: uploadError } = await storage().uploadToSignedUrl(storagePath, token, photo, { contentType: photo.type })
          if (uploadError) throw uploadError
        }
        await registerAddendumPhoto(entry.id, addendumId, { ...input, storagePath, sizeBytes: photo.size, note: null })
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
              <img src={photo.url} alt={photo.note ?? photo.label ?? w.updatePhoto} className="h-24 w-full rounded border border-gray-200 object-contain" />
              <figcaption className="flex flex-wrap items-center justify-between gap-1 text-xs text-gray-500">
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
                  className="action-danger px-2 text-xs"
                >
                  {w.remove}
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <label className="action-secondary cursor-pointer px-3 text-xs">
        {pending ? w.uploading : w.addPhotos}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          disabled={pending}
          aria-label={w.photosFor(entry.name ?? entry.roomName)}
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
