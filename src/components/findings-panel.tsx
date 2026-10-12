'use client'

import { useState, useTransition } from 'react'
import { sgd } from '@/lib/format'
import { CHANGE_TYPES, VERDICTS } from '@/lib/inspection/schema'
import { createFinding, deleteFinding, updateFinding } from '@/lib/actions'
import { publishAssessment } from '@/lib/assessment-actions'
import type { ChangeType, Verdict } from '@/generated/prisma'

export type FindingRow = {
  id: string
  changeType: ChangeType
  verdict: Verdict
  rationale: string
  estimatedCost: string | null
  editedByHuman: boolean
  itemLabel: string | null
  baselineLabel: string | null
  baselineCondition: string | null
  currentCondition: string | null
  maintenanceCaseId: string | null
  maintenanceCaseTitle: string | null
}

const CHANGE_TONE: Record<ChangeType, string> = {
  UNCHANGED: 'bg-gray-100 text-gray-600',
  WEAR: 'bg-amber-50 text-amber-800',
  DAMAGE: 'bg-red-50 text-red-700',
  MISSING: 'bg-red-50 text-red-700',
  IMPROVED: 'bg-emerald-50 text-emerald-700',
}

const VERDICT_LABEL: Record<Verdict, string> = {
  TENANT_LIABLE: 'Tenant liable',
  FAIR_WEAR: 'Fair wear and tear',
  DISPUTED: 'Disputed',
  UNDECIDED: 'Undecided',
}

/// An item either report lists, as the add form offers it.
export type ComparableItem = { id: string; label: string }

/// Writes one finding. The check-out list comes first because most findings are about
/// something still there; the check-in list covers what has gone missing.
function AddFinding({
  inspectionId,
  checkOutItems,
  checkInItems,
}: {
  inspectionId: string
  checkOutItems: ComparableItem[]
  checkInItems: ComparableItem[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form)
    const [side, id] = String(data.get('item')).split(':')
    const cost = String(data.get('estimatedCost'))
    startTransition(async () => {
      setError(null)
      try {
        await createFinding(inspectionId, {
          itemId: side === 'out' ? id : null,
          baselineItemId: side === 'in' ? id : null,
          changeType: data.get('changeType') as ChangeType,
          verdict: data.get('verdict') as Verdict,
          rationale: String(data.get('rationale')).trim(),
          estimatedCost: cost || null,
        })
        form.reset()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(e.currentTarget)
      }}
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      <h3 className="text-sm font-medium">Add a finding</h3>
      <select
        name="item"
        required
        defaultValue=""
        aria-label="Item"
        className="w-full rounded border border-gray-200 px-2 py-2 text-sm focus:border-brand-500 focus:outline-none"
      >
        <option value="" disabled>
          Which item?
        </option>
        <optgroup label="At check-out">
          {checkOutItems.map((item) => (
            <option key={item.id} value={`out:${item.id}`}>
              {item.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="At check-in (for anything missing)">
          {checkInItems.map((item) => (
            <option key={item.id} value={`in:${item.id}`}>
              {item.label}
            </option>
          ))}
        </optgroup>
      </select>
      <div className="flex flex-wrap gap-3">
        <select
          name="changeType"
          defaultValue="DAMAGE"
          aria-label="Change"
          className="rounded border border-gray-200 px-2 py-1 text-xs font-medium focus:border-brand-500 focus:outline-none"
        >
          {CHANGE_TYPES.map((c) => (
            <option key={c} value={c}>
              {c.toLowerCase()}
            </option>
          ))}
        </select>
        <select
          name="verdict"
          defaultValue="UNDECIDED"
          aria-label="Verdict"
          className="rounded border border-gray-200 px-2 py-1 text-xs font-medium focus:border-brand-500 focus:outline-none"
        >
          {VERDICTS.map((v) => (
            <option key={v} value={v}>
              {VERDICT_LABEL[v]}
            </option>
          ))}
        </select>
        <input
          name="estimatedCost"
          type="number"
          step="0.01"
          min="0"
          placeholder="Make-good cost"
          className="w-36 rounded border border-gray-200 px-2 py-1 text-xs tabular-nums focus:border-brand-500 focus:outline-none"
        />
      </div>
      <textarea
        name="rationale"
        required
        rows={2}
        placeholder="What changed, and why it is or is not the tenant's to make good"
        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {pending ? 'Adding' : 'Add finding'}
      </button>
    </form>
  )
}

export function FindingsPanel({
  inspectionId,
  findings,
  depositAmount,
  publishedVersion,
  maintenanceCases,
  checkOutItems,
  checkInItems,
}: {
  inspectionId: string
  findings: FindingRow[]
  depositAmount: string
  publishedVersion: number | null
  maintenanceCases: { id: string; title: string; status: string }[]
  checkOutItems: ComparableItem[]
  checkInItems: ComparableItem[]
}) {
  const [pending, startTransition] = useTransition()
  // With no findings, publishing states that no damage was found. The server refuses
  // that unless it is confirmed, so the agent has to tick it.
  const [noDamage, setNoDamage] = useState(false)
  const empty = findings.length === 0

  const liable = findings.filter((f) => f.verdict === 'TENANT_LIABLE')
  const claimTotal = liable.reduce((sum, f) => sum + Number(f.estimatedCost ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between rounded-lg border border-gray-200 bg-white px-5 py-4">
        <div>
          <h2 className="text-sm font-medium">Deposit position</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {findings.length === 0
              ? 'No findings yet. Add one for each change since check-in.'
              : `${liable.length} of ${findings.length} findings assessed as tenant liability`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tabular-nums">{sgd(claimTotal)}</p>
          <p className="text-xs text-gray-500">of {sgd(depositAmount)} held</p>
        </div>
      </div>

      {findings.length > 0 && (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {findings.map((finding) => (
            <li key={finding.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {finding.itemLabel ?? finding.baselineLabel ?? 'Unmatched item'}
                  </p>
                  {finding.baselineCondition && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {finding.baselineCondition} at check-in ·{' '}
                      {finding.currentCondition ?? 'not found'} at check-out
                    </p>
                  )}
                </div>
                <select
                  defaultValue={finding.changeType}
                  onChange={(e) =>
                    startTransition(() =>
                      void updateFinding(finding.id, inspectionId, {
                        changeType: e.target.value as ChangeType,
                      }),
                    )
                  }
                  aria-label="Change"
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium focus:outline-none ${CHANGE_TONE[finding.changeType]}`}
                >
                  {CHANGE_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {c.toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                defaultValue={finding.rationale}
                rows={2}
                aria-label="Rationale"
                onBlur={(e) =>
                  e.target.value.trim() &&
                  e.target.value.trim() !== finding.rationale &&
                  startTransition(() =>
                    void updateFinding(finding.id, inspectionId, { rationale: e.target.value.trim() }),
                  )
                }
                className="mt-2 w-full rounded border border-transparent px-1.5 py-1 text-sm text-gray-600 hover:border-gray-200 focus:border-brand-500 focus:outline-none"
              />

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {/* Findings drafted by the old AI comparison still need a person's pass. */}
                {!finding.editedByHuman && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() =>
                      void updateFinding(finding.id, inspectionId, { verdict: finding.verdict }),
                    )}
                    className="text-xs font-medium text-brand-600 underline disabled:opacity-50"
                  >
                    Mark reviewed
                  </button>
                )}
                <select
                  defaultValue={finding.verdict}
                  onChange={(e) =>
                    startTransition(() =>
                      void updateFinding(finding.id, inspectionId, {
                        verdict: e.target.value as Verdict,
                      }),
                    )
                  }
                  className="rounded border border-gray-200 px-2 py-1 text-xs font-medium focus:border-brand-500 focus:outline-none"
                >
                  {VERDICTS.map((v) => (
                    <option key={v} value={v}>
                      {VERDICT_LABEL[v]}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  step="0.01"
                  defaultValue={finding.estimatedCost ?? ''}
                  placeholder="Make-good cost"
                  onBlur={(e) =>
                    startTransition(() =>
                      void updateFinding(finding.id, inspectionId, {
                        estimatedCost: e.target.value || null,
                      }),
                    )
                  }
                  className="w-36 rounded border border-gray-200 px-2 py-1 text-xs tabular-nums focus:border-brand-500 focus:outline-none"
                />

                <select
                  value={finding.maintenanceCaseId ?? ''}
                  onChange={(e) =>
                    startTransition(() =>
                      void updateFinding(finding.id, inspectionId, {
                        maintenanceCaseId: e.target.value || null,
                      }),
                    )
                  }
                  className="max-w-64 rounded border border-gray-200 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
                  aria-label="Linked maintenance record"
                >
                  <option value="">No maintenance evidence</option>
                  {maintenanceCases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {item.status.toLowerCase().replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => void deleteFinding(finding.id, inspectionId))}
                  className="ml-auto text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddFinding
        inspectionId={inspectionId}
        checkOutItems={checkOutItems}
        checkInItems={checkInItems}
      />

      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <p className="text-gray-600">
          Check every finding against the signed inventory and evidence. Publishing makes
          a dated assessment available in the shared report; later edits require a new version.
        </p>
        {findings.some((finding) => !finding.editedByHuman) && (
          <p className="mt-2 text-amber-800">Review each finding before publishing.</p>
        )}
        {publishedVersion && (
          <p className="mt-2 text-xs text-gray-500">Published version {publishedVersion}</p>
        )}
        {empty && (
          <label className="mt-3 flex items-start gap-2 text-gray-800">
            <input
              type="checkbox"
              checked={noDamage}
              onChange={(event) => setNoDamage(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              No damage was found. Both parties will see a no-damage assessment in the
              shared report.
            </span>
          </label>
        )}
        <button
          type="button"
          disabled={
            pending || (empty && !noDamage) || findings.some((finding) => !finding.editedByHuman)
          }
          onClick={() => startTransition(() => void publishAssessment(inspectionId, { noFindings: empty }))}
          className="mt-3 rounded-md bg-brand-600 px-3 py-2 font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Publishing…' : empty ? 'Publish: no damage found' : 'Publish assessment'}
        </button>
      </div>
    </div>
  )
}
