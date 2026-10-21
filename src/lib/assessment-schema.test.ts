import { describe, expect, it } from 'vitest'
import { assessmentSnapshotSchema } from '@/lib/assessment-schema'

const finding = {
  id: 'finding', itemLabel: 'Kitchen, Worktop', changeType: 'DAMAGE', verdict: 'UNDECIDED',
  rationale: 'Burn beside the hob.', estimatedCost: null, confidence: null, editedByHuman: true,
}

describe('assessment photo snapshots', () => {
  it('keeps versions published before finding photos readable without inventing evidence', () => {
    const older = assessmentSnapshotSchema.parse({ schemaVersion: 1, summary: null, findings: [finding] })
    expect(older.findings[0].photos).toBeUndefined()
  })

  it('retains the original photo path, captions and separate server-stamped geometry', () => {
    const photo = {
      id: 'photo', storagePath: 'finding-photos/original.jpg', mimeType: 'image/jpeg',
      note: 'Burn beside the hob.', createdAt: '2026-10-21T01:00:00.000Z',
      annotations: {
        v: 1, by: 'inspector', at: '2026-10-21T01:10:00.000Z', w: 1200, h: 1600,
        marks: [{ shape: 'arrow', tx: .2, ty: .2, hx: .6, hy: .7, note: 'Burn edge' }],
      },
    }
    const parsed = assessmentSnapshotSchema.parse({ schemaVersion: 1, summary: null, findings: [{ ...finding, photos: [photo] }] })
    expect(parsed.findings[0].photos).toEqual([photo])
  })
})
