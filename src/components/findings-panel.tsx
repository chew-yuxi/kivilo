'use client'

import { useTransition } from 'react'
import { sgd } from '@/lib/format'
import { VERDICTS } from '@/lib/inspection/schema'
import { runFindings, updateFinding } from '@/app/inspections/[id]/actions'
import type { ChangeType, Verdict } from '@/generated/prisma'

export type FindingRow = {
  id: string
  changeType: ChangeType
  verdict: Verdict
  rationale: string
  estimatedCost: string | null
  confidence: number | null
  itemLabel: string | null
  baselineLabel: string | null
  baselineCondition: string | null
  currentCondition: string | null
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

export function FindingsPanel({
  inspectionId,
  findings,
  depositAmount,
}: {
  inspectionId: string
  findings: FindingRow[]
  depositAmount: string
}) {
  const [pending, startTransition] = useTransition()

  const liable = findings.filter((f) => f.verdict === 'TENANT_LIABLE')
  const claimTotal = liable.reduce((sum, f) => sum + Number(f.estimatedCost ?? 0), 0)

  if (findings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
        <h2 className="text-sm font-medium">Compare against check-in</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
          Both reports are signed. Draft the item-by-item comparison and the damage versus
          fair-wear-and-tear assessment.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => void runFindings(inspectionId))}
          className="mt-6 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {pending ? 'Comparing…' : 'Draft comparison'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between rounded-lg border border-gray-200 bg-white px-5 py-4">
        <div>
          <h2 className="text-sm font-medium">Deposit position</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {liable.length} of {findings.length} findings drafted as tenant liability
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tabular-nums">{sgd(claimTotal)}</p>
          <p className="text-xs text-gray-500">of {sgd(depositAmount)} held</p>
        </div>
      </div>

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
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${CHANGE_TONE[finding.changeType]}`}
              >
                {finding.changeType.toLowerCase()}
              </span>
            </div>

            <p className="mt-2 text-sm text-gray-600">{finding.rationale}</p>

            <div className="mt-3 flex items-center gap-3">
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

              {finding.confidence !== null && finding.confidence < 0.6 && (
                <span className="text-xs text-amber-700">low confidence, check the video</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
