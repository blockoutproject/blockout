export class ApiError extends Error {
  public readonly status: number;
  public readonly data: unknown;
  public readonly code?: string;
  public readonly requestId?: string;
  public readonly retryAfter?: string;

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

export class NotAuthenticatedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "NotAuthenticatedError";
  }
}
