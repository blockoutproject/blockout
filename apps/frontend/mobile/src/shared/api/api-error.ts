/** Transport failure shared by API adapters; each adapter owns safe messages and retained data. */
export class ApiError extends Error {
  public readonly status: number;
  public readonly data: unknown;
  public readonly code?: string;
  public readonly requestId?: string;
  public readonly retryAfter?: string;

  /**
   * Retains the adapter's failure and recovery metadata without interpreting provider payloads.
   * @param status - HTTP status, or zero when no HTTP response is available.
   * @param message - Adapter-selected user-safe message.
   * @param data - Optional adapter-owned details; the core adapter deliberately omits raw bodies.
   * @param meta - Wire code, request identifier and unparsed Retry-After header when available.
   */
  constructor(
    status: number,
    message: string,
    data?: unknown,
    meta?: { code?: string; requestId?: string; retryAfter?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = meta?.code;
    this.requestId = meta?.requestId;
    this.retryAfter = meta?.retryAfter;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/** Signals that a caller has no usable session before an authenticated operation. */
export class NotAuthenticatedError extends Error {
  /** @param message - Safe session failure text; defaults to the authentication prompt. */
  constructor(message = "Authentication required") {
    super(message);
    this.name = "NotAuthenticatedError";
  }
}
