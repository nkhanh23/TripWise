# Remote functional evidence

Target: TripWise, `bvblyrzbkyhcreimuumu`, `ap-northeast-1`, `ACTIVE_HEALTHY`.

Fresh disposable user A/B sessions and a two-day unresolved trip were used. Admin credentials were limited to test-user provisioning/cleanup; T004 authorization, reads, applies, and visibility checks used ordinary authenticated sessions.

- Canonical authoritative unresolved baseline parsed successfully.
- Swapped proposal returned `ready`.
- Proposal generation: zero apply RPC and zero idempotency rows.
- Owner first confirm: success through `TripRefreshCoordinator` and production repositories.
- Revision: 9 → 11; authoritative schedule matched the reviewed proposal.
- Effective refresh mutations: 1.
- Fresh-client duplicate: one server call returned the stored revision 11; no second graph mutation or revision advance.
- User A saw exactly one primary durable idempotency row; user B saw none.
- Optional no-op: `noOp=true`, revision unchanged; duplicate returned the same durable result.
- Stale attempt: server `TW018`, mapped conflict; schedule/newer workspace remained intact and no successful stale idempotency result existed.
- Cross-user attempt: server `TW017`, mapped notFound; zero side effect and zero user-A idempotency visibility.
- All non-scheduling fields remained equal across the successful refresh; unresolved items remained `UNRESOLVED` with canonical null coordinates and no provider identifiers.
- Bound item retained its day, position, timing, priority, and metadata.
- Ordinary authenticated PostgREST private-schema probe was blocked.
- Cleanup: one trip and two users deleted; zero remaining trips; PASS.

Request accounting from the passing run:

- authenticated authoritative reads: 9;
- proposal generations: 2;
- first logical apply calls: 1;
- duplicate server calls: 1;
- effective refresh mutations: 1;
- legitimate workspace mutations: 3;
- stale attempts: 1;
- cross-user attempts: 1;
- revision-advancing logical operations: 4 including two fixture setup mutations, the effective refresh, and the stale-test workspace mutation;
- durable T004 rows before cleanup: 2, one effective apply plus one no-op.

No real ambiguous network retry was induced. The existing local controlled transport regression proves retry identity stability; the remote duplicate proves server durability across a fresh client instance.
