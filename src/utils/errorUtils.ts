export type AppErrorKind = 'network' | 'timeout' | 'http' | 'parse' | 'cancelled' | 'unknown';

/**
 * Normalized error shape for everything that can go wrong while talking to the API,
 * so screens only ever deal with one error type.
 */
export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status?: number;

  constructor(kind: AppErrorKind, message: string, options?: { status?: number; cause?: unknown }) {
    super(message);
    this.name = 'AppError';
    // Assigned directly rather than via the ES2022 `Error` options, which Hermes may ignore.
    this.cause = options?.cause;
    this.kind = kind;
    this.status = options?.status;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof Error) {
    return new AppError('unknown', error.message, { cause: error });
  }
  return new AppError('unknown', 'Unknown error', { cause: error });
}

/** User-facing copy for an error. Never surfaces raw technical messages. */
export function getErrorMessage(error: AppError): string {
  switch (error.kind) {
    case 'network':
      return 'Unable to connect. Check your internet connection and try again.';
    case 'timeout':
      return 'The request took too long. Please try again.';
    case 'http':
      return error.status !== undefined && error.status >= 500
        ? 'The server is having trouble right now. Please try again later.'
        : 'Something went wrong while loading data.';
    case 'parse':
      return 'We received an unexpected response from the server.';
    case 'cancelled':
      return 'The request was cancelled.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
