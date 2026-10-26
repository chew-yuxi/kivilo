/// Messages are fixed and safe for clients: a purchase token must never reach error logs.
export class PlayBillingError extends Error {
  constructor(public readonly code: 'billing_unavailable' | 'billing_conflict' | 'invalid_purchase' | 'purchase_not_found', message: string, public readonly notificationHandled = false) {
    super(message)
    this.name = 'PlayBillingError'
  }
}
