# Backend Security Review

Phase 11.4 focused on a backend-only security pass before frontend exposure.

## Scope reviewed

- JWT authentication and token settings
- Error response safety
- CORS policy
- Public API documentation exposure
- Input validation coverage on exposed controllers
- SQL injection risk in repository/query code
- Rate limiting on auth and expensive trip generation

## Findings and fixes

1. Swagger/OpenAPI endpoints were publicly accessible in every environment.
   - Fixed by making public docs exposure configurable.
   - Default is now private unless `tripwise.security.docs-public-enabled=true`.
2. CORS origins were hardcoded in Java config.
   - Fixed by moving allowed origins to configuration properties.
   - Local profile keeps localhost origins for frontend development.
3. Trip generation did not have its own rate-limit rule even though it is a costly endpoint.
   - Fixed by extending the existing rate-limit interceptor to `/api/v1/trips/generate`.
   - Requests are limited per authenticated user when available, otherwise by client IP.
4. JWT secret length was not validated at configuration level.
   - Fixed by requiring a minimum secret length of 32 characters.
5. General exception handling already avoided returning stack traces to clients.
   - Added explicit test coverage for that behavior.

## Review notes

- No direct secret exposure was found in API DTO responses that were reviewed.
- Repository/query code reviewed in this phase uses JPA/native parameter binding and does not expose an obvious SQL injection issue.
- Validation coverage is present on the main request DTO and query objects already in use; this phase focused on security-sensitive gaps rather than broad endpoint refactoring.
