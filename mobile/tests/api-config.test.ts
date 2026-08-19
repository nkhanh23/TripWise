import { normalizeApiBaseUrl } from '../src/api/config';

describe('normalizeApiBaseUrl', () => {
  it('adds the shared API version path when it is omitted', () => {
    expect(normalizeApiBaseUrl('http://localhost:8080/')).toBe('http://localhost:8080/api/v1');
  });

  it('keeps an existing API version path', () => {
    expect(normalizeApiBaseUrl('http://10.0.2.2:8080/api/v1')).toBe('http://10.0.2.2:8080/api/v1');
  });
});
