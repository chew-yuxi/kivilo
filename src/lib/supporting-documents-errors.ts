export class SupportingDocumentError extends Error {
  constructor(
    public readonly code: 'document_conflict' | 'document_missing' | 'invalid_document',
    message: string,
  ) {
    super(message)
    this.name = 'SupportingDocumentError'
  }
}
