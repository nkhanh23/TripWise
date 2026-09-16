# Scope and evidence classification

VERIFIED FROM SOURCE / VERIFIED FROM TEST EVIDENCE, not Android runtime.

- Policy reads only candidate.type. Proxy tests throw if another candidate field is accessed. All five titles are static EN/VI dictionary strings; no dynamic itinerary body is produced.
- No place names, coordinates, booking codes, notes, contacts, provider IDs/payloads, budgets, emails or private itinerary text are used in T003 notification presentation.
- T003 repository reads only user_id and two booleans. Writes contain only the chosen boolean; initial insert uses server auth.uid() default. No OS permission is persisted, no new service-role/Edge/RPC path exists. All transport errors are sanitized.
- Actual Expo metadata boundary remains the byte-identical T002 repository: marker, opaque logicalId/fingerprint/ownerScope, internal trip/day/item UUIDs, reminder type and trigger time. No new runtime metadata is added. Native enumeration of the T003 path remains NOT RUN.
- Source Android manifest and merged debug manifest contain neither SCHEDULE_EXACT_ALARM nor USE_EXACT_ALARM. Merged manifest contains POST_NOTIFICATIONS from the installed Expo dependency. No manifest/dependency changes were made.
- No permission request at bootstrap/mount/general resume. The only request call is behind explicit opt-in and current-session guards. Channel preparation is real T002 prepare(), before the Android 13+ prompt.
- OFF's native cancellation is independent of remote trip reads. Native dispatch serialization drains earlier in-flight work before a newer enumeration; guards suppress stale queued mutations.
- Preference access is a single PK/owner lookup; update path is at most two requests, one attempt with 10-second timeout. Opt-in trip loading uses an owner-filtered 61-ID sentinel and at most 60 existing detail RPCs; overflow fails closed without reconciling a truncated desired set. This bounded 1+N detail loading remains a latency risk for unusually large owner itineraries, not proof of high-volume performance. No additional provider calls occur for OFF/denied.
- No general edit/sign-out/reboot/background orchestration, ARRIVED, geofence, or T002 semantic changes.

Test SQL runs retain isolated databases tripwise_t003_20260914230140 and tripwise_t003_20260914230441 for inspection. The second run includes broad-default ACL, timestamp-trigger and cascade tests. No existing database/container was removed. No remote deployment was performed.
