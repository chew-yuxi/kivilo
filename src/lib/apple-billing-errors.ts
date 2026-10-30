// Fixed public wording only; signed transactions and provider diagnostics are secrets.
export class AppleBillingError extends Error {
  constructor(public readonly code: 'billing_unavailable' | 'billing_conflict' | 'invalid_purchase' | 'purchase_not_found', message: string) {
    super(message)
    this.name = 'AppleBillingError'
  }
}
