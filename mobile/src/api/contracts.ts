export type ValidationError = {
  field: string;
  issue: string;
};

export type BackendErrorResponse = {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  errorCode?: string;
  correlationId?: string;
  details?: ValidationError[];
  detailsData?: unknown;
};
