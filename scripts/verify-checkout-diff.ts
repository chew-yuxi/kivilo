import 'dotenv/config'
import assert from 'node:assert/strict'
import { diffAgainstBaseline } from '../src/lib/inspection/diff'

// Synthetic evidence only. Confirm the configured Gemini model accepts the real
// check-out schema and catches common comparison mistakes without sharing tenant data.
async function main() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for check-out comparison')
  }

  const result = await diffAgainstBaseline({
    propertyLabel: 'Synthetic review unit, Singapore',
    tenancyMonths: 24,
    baseline: [
      {
        ref: 'b-paint', room: 'Living room', name: 'Wall paint', category: 'SURFACE',
        condition: 'GOOD', quantity: 1, notes: 'Even finish, no marks',
        identifier: null, meterReading: null,
      },
      {
        ref: 'b-lamp', room: 'Bedroom', name: 'Bedside lamp', category: 'APPLIANCE',
        condition: 'GOOD', quantity: 1, notes: 'Working',
        identifier: 'Model B1 serial LAMP-001', meterReading: null,
      },
      {
        ref: 'b-fridge', room: 'Kitchen', name: 'Refrigerator', category: 'APPLIANCE',
        condition: 'GOOD', quantity: 1, notes: 'Working',
        identifier: 'CoolCo C300 serial FR-100', meterReading: null,
      },
      {
        ref: 'b-sink', room: 'Bathroom', name: 'Washbasin', category: 'FIXTURE',
        condition: 'GOOD', quantity: 1, notes: 'Clean, intact',
        identifier: null, meterReading: null,
      },
    ],
    current: [
      {
        ref: 'c-paint', room: 'Living room', name: 'Wall paint', category: 'SURFACE',
        condition: 'FAIR', quantity: 1, notes: 'Light scuffs at doorway; no dents or holes',
        identifier: null, meterReading: null,
      },
      {
        ref: 'c-fridge', room: 'Kitchen', name: 'Refrigerator', category: 'APPLIANCE',
        condition: 'GOOD', quantity: 1, notes: 'Working',
        identifier: 'CoolCo C300 serial FR-999', meterReading: null,
      },
      {
        ref: 'c-sink', room: 'Bathroom', name: 'Washbasin', category: 'FIXTURE',
        condition: 'GOOD', quantity: 1, notes: 'Clean, intact',
        identifier: null, meterReading: null,
      },
    ],
  })

  const byBaseline = new Map(result.findings.map((finding) => [finding.baselineItemRef, finding]))
  if (result.findings.length !== 3) {
    console.error(JSON.stringify(result.findings.map((finding) => ({
      baselineItemRef: finding.baselineItemRef,
      itemRef: finding.itemRef,
      changeType: finding.changeType,
      verdict: finding.verdict,
      rationale: finding.rationale,
    }))))
  }
  assert.equal(result.findings.length, 3, 'Expected exactly the three changed items')
  assert.equal(byBaseline.get('b-paint')?.itemRef, 'c-paint')
  assert.equal(byBaseline.get('b-paint')?.changeType, 'WEAR')
  assert.equal(byBaseline.get('b-paint')?.verdict, 'FAIR_WEAR')
  assert.equal(byBaseline.get('b-lamp')?.itemRef, null)
  assert.equal(byBaseline.get('b-lamp')?.changeType, 'MISSING')
  assert.equal(byBaseline.get('b-lamp')?.verdict, 'UNDECIDED')
  assert.equal(byBaseline.get('b-fridge')?.itemRef, 'c-fridge')
  assert.notEqual(byBaseline.get('b-fridge')?.changeType, 'UNCHANGED')
  assert.equal(byBaseline.has('b-sink'), false, 'Unchanged item must be omitted')
  const explanation = [result.summary, ...result.findings.map((finding) => finding.rationale)]
    .join(' ')
  assert.doesNotMatch(explanation, /photograph|unauthori[sz]ed|not present at (the )?check-out inspection/i,
    'The draft must not claim evidence or authorization absent from the input')

  console.log(JSON.stringify({
    model: 'gemini-3.1-pro-preview',
    findings: result.findings.map((finding) => ({
      baselineItemRef: finding.baselineItemRef,
      itemRef: finding.itemRef,
      changeType: finding.changeType,
      verdict: finding.verdict,
      rationale: finding.rationale,
    })),
  }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
