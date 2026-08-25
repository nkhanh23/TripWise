import type { BackendErrorResponse } from "./contracts";

export class ApiException extends Error {
  readonly status: number;
  readonly error: string;
  readonly errorCode?: string;
  readonly correlationId?: string;
  readonly details?: BackendErrorResponse["details"];
  readonly detailsData?: unknown;

  constructor(response: BackendErrorResponse) {
    super(response.message);
    this.name = "ApiException";
    this.status = response.status;
    this.error = response.error;
    this.errorCode = response.errorCode;
    this.correlationId = response.correlationId;
    this.details = response.details;
    this.detailsData = response.detailsData;
  }
}

export class ApiTimeoutException extends Error {
  constructor() {
    super("The request timed out. Please try again.");
    this.name = "ApiTimeoutException";
  }
}
