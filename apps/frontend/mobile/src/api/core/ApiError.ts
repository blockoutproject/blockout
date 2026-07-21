export class ApiError extends Error {
  public readonly status: number;
  public readonly data: any;
  public readonly code?: string;
  public readonly requestId?: string;

  constructor(
    status: number,
    message: string,
    data?: any,
    meta?: { code?: string; requestId?: string }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = meta?.code;
    this.requestId = meta?.requestId;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class NotAuthenticatedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "NotAuthenticatedError";
  }
}
