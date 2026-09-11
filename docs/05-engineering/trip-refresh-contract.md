# FEATURE-P5-T004 — Multi-stage trip refresh contract

## Scope and current persistence boundary

T004 separates refresh into five explicit stages: authoritative baseline, reviewed proposal, machine-readable diff, explicit confirmation, and guarded application. Proposal generation and recomputation are side-effect free. They do not call a workspace mutation, replace a trip, bump a revision, or persist provider output.

The current production `TravelWorkspaceRepository` supports one CAS-protected item command at a time. It has no atomic whole-itinerary refresh primitive. T004 therefore defines `AtomicTripRefreshApplyRepository` as the required application port but does not implement it with a sequence of existing workspace commands. A production adapter must provide owner-scoped RLS, `expectedRevision` CAS, confirmation idempotency, and the complete reviewed change in one server transaction. Until that primitive exists, the contract can be tested with a controlled atomic adapter, but production apply/runtime evidence is unavailable.

## Proposal identity and lifetime

`createTripRefreshProposal` validates the authoritative baseline first, requires its explicit `workspaceRevision`, validates the proposed itinerary against that exact baseline through P5-T001, and then parses both canonical saved-trip snapshots. It does not infer a missing revision or repair malformed data.

A proposal contains the trip ID, owner ID, opaque session identity, exact baseline revision, injected creation timestamp, reviewed baseline/proposed snapshots, deterministic diff, and declared stage outcomes. The deterministic `proposalId` derives from canonical content, owner/session binding, revision, diff, and stage provenance. The `confirmationId` is distinct and stable for retries of that proposal. These fingerprints are content identities, not bearer authorization or cryptographic authentication; the production apply boundary must still enforce the authenticated owner and RLS.

The coordinator stores reviewed proposals only in memory. It binds them to one owner/session and can clear that session on auth change. It accepts at most eight declared stages per proposal and retains at most 32 proposal records; the oldest record is evicted deterministically. Proposal state does not survive process death, app restart, or a different device. T004 does not claim durable proposal storage.

## Diff semantics

The diff uses canonical itinerary item UUIDs only. It never matches on place name, coordinates, title, provider text, or array order. Each item has one or more machine-readable classifications:

- `retained`
- `moved`
- `added`
- `removed`
- `scheduling_time_changed`
- `metadata_changed`

Entries use ordinal item-ID ordering and explicit before/after day, position, and time locations. Metadata field names are explicit and deterministically sorted. Duplicate or malformed identities are rejected by T001 before a proposal is created. This narrow contract keeps trip envelope and day identity/date/summary unchanged; arbitrary full-trip replacement is an invalid proposal.

## Protected constraints and stage composition

P5-T001 remains authoritative. Proposal creation rejects removal or movement of FIXED items and removal/downgrade of MUST_DO items. Confirmation validates the stored immutable proposal against its stored baseline again before any read or write. A conflict is not confirmable and crosses no mutation boundary.

T002 route and T003 weather results can be supplied as reviewed candidate snapshots with explicit stage outcome metadata. T004 does not call OSRM or Open-Meteo, duplicate their policies, or re-fetch either provider during confirmation. The reviewed snapshot is what the atomic application port receives. A failed stage may retain the baseline and record an explicit fallback outcome; it cannot silently write a different trip.

## Explicit confirmation and conflict behavior

Public confirmation input contains only proposal ID, confirmation ID, trip ID, and expected baseline revision. The coordinator looks up the stored immutable snapshot and checks owner/session binding and every identifier. Caller-provided replacement graphs are not accepted as confirmation.

Confirmation performs one authoritative trip read. A missing trip, absent revision, or changed revision returns `stale_baseline_revision`, performs zero apply calls, and never regenerates or replays. A repository CAS conflict has the same no-replay behavior. No-op proposals still check the authoritative revision, then return `no_op` with zero mutation.

Concurrent duplicate confirmation calls share one in-flight operation. After success, an exact duplicate returns `proposal_already_applied` without another mutation. A retry after an ambiguous transport failure reuses the same confirmation/idempotency identity; durable exactly-once behavior remains the responsibility of the future atomic server primitive. UI button state is not the idempotency mechanism.

Cancellation before generation or confirmation causes zero reads/writes. The latest-only generator aborts the previous generation and suppresses its late result. Owner/session changes must clear local proposals and abort caller-owned work. No persistence, migration, RPC, Edge function, route fetch, weather fetch, or T005 explanation UI is added by this contract.
