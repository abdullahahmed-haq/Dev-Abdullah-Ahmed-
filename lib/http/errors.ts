export class PublicHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly publicMessage: string,
    options?: ErrorOptions,
  ) {
    super(publicMessage, options)
    this.name = 'PublicHttpError'
  }
}

export function asPublicHttpError(error: unknown, fallbackCode: string, fallbackMessage: string): PublicHttpError {
  if (error instanceof PublicHttpError) return error
  return new PublicHttpError(500, fallbackCode, fallbackMessage, { cause: error })
}
