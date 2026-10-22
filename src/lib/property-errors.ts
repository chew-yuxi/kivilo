export class PropertyLifecycleError extends Error {
  constructor(public readonly code: 'property_history' | 'property_restore_expired' | 'property_trashed', message: string) {
    super(message)
    this.name = 'PropertyLifecycleError'
  }
}
