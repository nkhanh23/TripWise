import { ApiException } from '../src/api/errors';

describe('ApiException', () => {
  it('preserves the backend error contract for callers', () => {
    const error = new ApiException({
      status: 400,
      error: 'Bad Request',
      message: 'Invalid input',
      errorCode: 'VALIDATION_ERROR',
      correlationId: 'request-123',
      details: [{ field: 'email', issue: 'must be valid' }],
    });

    expect(error.status).toBe(400);
    expect(error.errorCode).toBe('VALIDATION_ERROR');
    expect(error.details?.[0]?.field).toBe('email');
  });
});
