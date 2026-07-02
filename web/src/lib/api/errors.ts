import type { ErrorResponse } from "./contracts";

export class ApiError extends Error {
  readonly status: number;
  readonly error: string;
  readonly errorCode?: string;
  readonly correlationId?: string;
  readonly details?: ErrorResponse["details"];

  constructor(payload: ErrorResponse) {
    super(payload.message);
    this.name = "ApiError";
    this.status = payload.status;
    this.error = payload.error;
    this.errorCode = payload.errorCode;
    this.correlationId = payload.correlationId;
    this.details = payload.details;
  }
}

export class AuthSessionExpiredError extends Error {
  constructor(message = "Your session has expired. Please sign in again.") {
    super(message);
    this.name = "AuthSessionExpiredError";
  }
}
