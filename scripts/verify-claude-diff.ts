import 'dotenv/config'
import { diffAgainstBaseline } from '../src/lib/inspection/diff'

// Synthetic evidence only. This verifies the configured Anthropic model, account
// funding and schema without disclosing a tenant's property data to a provider.
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required for the real check-out comparison')
  }
  const result = await diffAgainstBaseline({
    propertyLabel: 'Synthetic review unit, Singapore',
    tenancyMonths: 24,
    baseline: [{
      ref: 'baseline-demo-door',
      room: 'Kitchen',
      name: 'Cabinet door',
      category: 'FIXTURE',
      condition: 'GOOD',
      quantity: 1,
      notes: 'No cracks',
      identifier: null,
      meterReading: null,
    }],
    current: [{
      ref: 'checkout-demo-door',
      room: 'Kitchen',
      name: 'Cabinet door',
      category: 'FIXTURE',
      condition: 'DAMAGED',
      quantity: 1,
      notes: 'Hinge split and door hanging loose',
      identifier: null,
      meterReading: null,
    }],
  })

  console.log(JSON.stringify({
    model: 'claude-opus-5',
    findings: result.findings.length,
    verdicts: result.findings.map((finding) => finding.verdict),
  }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
