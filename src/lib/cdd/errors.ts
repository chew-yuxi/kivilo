/// Something the person filling in a form can fix. Its message is safe to show them, and
/// the API answers it as 400 `invalid_input`.
export class CddInputError extends Error {}

/// The case is not in a state that allows this (particulars already in, not in yet). The
/// API answers it as 409 `invalid_state` with the message.
export class CddStateError extends Error {}
