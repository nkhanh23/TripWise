# FEATURE-P2-T002 reviewer evidence bundle

Generated from the live local checkout at `D:\Dev\TripWise` on 2026-09-07 (Asia/Bangkok). This document is an evidence-only reviewer aid. It does not replace the raw files beside it.

## Closure verdict and immutability

`FEATURE-P2-T002 = COMPLETE`

The current eight-file source manifest was checked before this document was created. Every current SHA-256 equals the recorded exact-current manifest value. The BEFORE and AFTER manifests are identical.

```text
T002_SOURCE_HASH_BEFORE=CEF208E176020B36C9664853D6A43D5F05CC64550A826F4CC519D0004A77D9A7
T002_SOURCE_HASH_AFTER=CEF208E176020B36C9664853D6A43D5F05CC64550A826F4CC519D0004A77D9A7
SOURCE_HASH_MATCH=True
CURRENT_SOURCE_MISMATCH_COUNT=0
```

The aggregate is the SHA-256 of the ordered `path=sha256` manifest lines joined with LF and no trailing LF. Per-file manifests are retained in `source-hashes-before.json` and `source-hashes-after.json`.

## Exact-current production source manifest

All eight files below belong to the existing exact-current manifest.

| Relative path | SHA-256 | In eight-file manifest |
|---|---|---|
| `mobile/src/features/trips/useWorkspaceMoveController.ts` | `C5A78D7EB3299AA50FC4919A1E806FEC180937B21FED88F96CE5A7B603A04398` | YES |
| `mobile/src/features/trips/components/WorkspaceMoveSheet.tsx` | `A2EC8593E250261D342B1EF9194078B2500D3DD5C8F7F3B92796E5AC1E5D6294` | YES |
| `mobile/src/features/trips/screens/TripDetailScreen.tsx` | `3EA34B8A7F3091F43CE9DC663EB94BAB2E6CF688BF5FF2028A0C40C1EFF98344` | YES |
| `mobile/src/integration/contracts.ts` | `F667123D2AC1164CCCD4925ACA0A3B244320BFAEDBC0E6B1AB3A633997885A1B` | YES |
| `mobile/src/integration/validation.ts` | `8E63533B46727C00B25C4C48B1BB33CC29A2C85F595A524CBDDD1B65314926B3` | YES |
| `mobile/src/integration/remote/supabaseTripRepositories.ts` | `9BC2E4E271CBF3B369F894D82C3D563A5A0785DDC18C30DE71F425A2E95EEFDE` | YES |
| `supabase/migrations/20260904000000_workspace_p2_t002_atomic_move.sql` | `828093D02D9BB67F2578B53514D3B2D02A8BA38C4126B4646EE33A2EAD63129B` | YES |
| `supabase/migrations/20260905000000_workspace_create_item_lock_corrective.sql` | `BB1A23EB1E4BFE465BD2C76D0977EB82022B7145DD7E685125B3C989E262B9BA` | YES |

## Line-numbered source excerpts

The excerpts below contain every T002-relevant branch and assertion. Omitted portions are imports, unrelated repository methods, unrelated validation contracts, or presentation styles. Line numbers are from the exact files whose hashes are listed above.

### `mobile/src/features/trips/useWorkspaceMoveController.ts` — complete file, lines 1-140

```tsx
   1: import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
   3: import type { ItineraryDayId, ItineraryItemId, SavedTripDetail } from '../../integration/contracts';
   4: import type { SavedTripsRepository, TravelWorkspaceRepository } from '../../integration/repositories';
   6: export type WorkspaceMoveController = {
   7:   selectedItemId: string | null;
   8:   targetDayId: string;
   9:   targetPosition: number;
  10:   saving: boolean;
  11:   conflict: boolean;
  12:   errorKey: string | null;
  13:   mutationReady: boolean;
  14:   selectedItemName: string;
  15:   positions: number[];
  16:   open: (itemId: string) => void;
  17:   close: () => void;
  18:   setTargetDayId: (dayId: string) => void;
  19:   setTargetPosition: (position: number) => void;
  20:   submit: () => Promise<void>;
  21: };
  23: /** P2-T002 orchestration boundary. The UI only selects a destination; this
  24:  * hook owns CAS, one-refresh conflict handling, double-submit and stale-view
  25:  * protection. Auth navigation unmounts this feature on session exit; a local
  26:  * generation token prevents its old request from mutating a later view. */
  27: export function useWorkspaceMoveController({
  28:   detail,
  29:   savedTripsRepository,
  30:   workspaceRepository,
  31:   onAuthoritativeDetail,
  32: }: {
  33:   detail: SavedTripDetail | null;
  34:   savedTripsRepository: SavedTripsRepository;
  35:   workspaceRepository: TravelWorkspaceRepository;
  36:   onAuthoritativeDetail: (detail: SavedTripDetail | null) => void;
  37: }): WorkspaceMoveController {
  38:   const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  39:   const [targetDayId, setTargetDayIdState] = useState('');
  40:   const [targetPosition, setTargetPosition] = useState(1);
  41:   const [saving, setSaving] = useState(false);
  42:   const [conflict, setConflict] = useState(false);
  43:   const [errorKey, setErrorKey] = useState<string | null>(null);
  44:   const generation = useRef(0);
  45:   const savingRef = useRef(false);
  46:   const isCurrent = useCallback((requestGeneration: number) => generation.current === requestGeneration, []);
  48:   useEffect(() => {
  49:     generation.current += 1;
  50:     savingRef.current = false;
  52:     setSaving(false);
  53:     setConflict(false);
  54:     setErrorKey(null);
  55:     setSelectedItemId(null);
  56:     return () => { generation.current += 1; };
  57:   }, [detail?.id]);
  59:   const selected = useMemo(() => detail?.days.flatMap((day) => day.items)
  60:     .find((item) => item.id === selectedItemId), [detail, selectedItemId]);
  61:   const sourceDay = useMemo(() => detail?.days.find((day) => day.items.some((item) => item.id === selectedItemId)), [detail, selectedItemId]);
  62:   const targetDay = useMemo(() => detail?.days.find((day) => day.id === targetDayId), [detail, targetDayId]);
  63:   const mutationReady = Number.isInteger(detail?.workspaceRevision) && (detail?.workspaceRevision ?? 0) >= 1;
  64:   const positions = useMemo(() => {
  65:     if (!sourceDay || !targetDay) return [];
  66:     const maximum = targetDay.id === sourceDay.id ? targetDay.items.length : targetDay.items.length + 1;
  67:     return Array.from({ length: maximum }, (_, index) => index + 1);
  68:   }, [sourceDay, targetDay]);
  70:   const open = useCallback((itemId: string) => {
  71:     const day = detail?.days.find((candidate) => candidate.items.some((item) => item.id === itemId));
  72:     const item = day?.items.find((candidate) => candidate.id === itemId);
  73:     if (!day || !item) return;
  74:     setSelectedItemId(itemId);
  75:     setTargetDayIdState(day.id);
  76:     setTargetPosition(item.position);
  77:     setErrorKey(null);
  78:     setConflict(false);
  79:   }, [detail]);
  80:   const close = useCallback(() => {
  81:     if (!savingRef.current) setSelectedItemId(null);
  82:   }, []);
  83:   const setTargetDayId = useCallback((dayId: string) => {
  84:     const day = detail?.days.find((candidate) => candidate.id === dayId);
  85:     if (!day || !sourceDay) return;
  86:     setTargetDayIdState(dayId);
  87:     setTargetPosition(dayId === sourceDay.id ? (selected?.position ?? 1) : day.items.length + 1);
  88:     setErrorKey(null);
  89:   }, [detail, selected?.position, sourceDay]);
  91:   const refreshOnce = useCallback(async (requestGeneration: number) => {
  92:     if (!detail) return;
  93:     const next = await savedTripsRepository.getDetail(detail.id);
  94:     if (isCurrent(requestGeneration)) onAuthoritativeDetail(next);
  95:   }, [detail, isCurrent, onAuthoritativeDetail, savedTripsRepository]);
  97:   const submit = useCallback(async () => {
  98:     if (savingRef.current || !detail || !selected || !sourceDay || !targetDay) return;
  99:     const expectedRevision = detail.workspaceRevision;
 100:     if (typeof expectedRevision !== 'number' || !Number.isInteger(expectedRevision) || expectedRevision < 1) {
 101:       setErrorKey('workspaceMove.unavailable');
 102:       return;
 103:     }
 104:     if (!positions.includes(targetPosition)) {
 105:       setErrorKey('workspaceMove.invalidPosition');
 106:       return;
 107:     }
 108:     const requestGeneration = generation.current;
 109:     savingRef.current = true;
 110:     setSaving(true);
 111:     setConflict(false);
 112:     setErrorKey(null);
 113:     try {
 114:       const result = await workspaceRepository.mutate({
 115:         type: 'move_item', tripId: detail.id, itemId: selected.id as ItineraryItemId,
 116:         expectedRevision, targetDayId: targetDay.id as ItineraryDayId, targetPosition,
 117:       });
 118:       if (!isCurrent(requestGeneration)) return;
 119:       if (!result.noOp) await refreshOnce(requestGeneration);
 120:       if (isCurrent(requestGeneration)) setSelectedItemId(null);
 121:     } catch (error: unknown) {
 122:       if (!isCurrent(requestGeneration)) return;
 123:       if ((error as { code?: string }).code === 'conflict') {
 124:         setConflict(true);
 125:         // Exactly one authoritative fetch. The requested move is never replayed.
 126:         try { await refreshOnce(requestGeneration); } catch { if (isCurrent(requestGeneration)) setErrorKey('workspaceMove.saveFailed'); }
 127:       } else setErrorKey('workspaceMove.saveFailed');
 128:     } finally {
 129:       if (isCurrent(requestGeneration)) {
 130:         savingRef.current = false;
 131:         setSaving(false);
 132:       }
 133:     }
 134:   }, [detail, isCurrent, positions, refreshOnce, selected, sourceDay, targetDay, targetPosition, workspaceRepository]);
 136:   return {
 137:     selectedItemId, targetDayId, targetPosition, saving, conflict, errorKey, mutationReady,
 138:     selectedItemName: selected?.placeName ?? '', positions, open, close, setTargetDayId, setTargetPosition, submit,
 139:   };
 140: }
```

### `mobile/src/features/trips/components/WorkspaceMoveSheet.tsx` — behavior, lines 10-48

```tsx
  10: export function WorkspaceMoveSheet({ detail, controller }: { detail: SavedTripDetail | null; controller: WorkspaceMoveController }) {
  13:   const visible = controller.selectedItemId !== null;
  15:     <Modal animationType="none" onRequestClose={controller.close} transparent visible={visible}>
  21:           {controller.conflict ? (
  22:             <View accessibilityRole="alert" style={[styles.alert, { backgroundColor: colors.background.canvas }]}>
  23:               <Text style={[styles.alertTitle, { color: colors.text.primary }]}>{t('workspaceMove.conflictTitle')}</Text>
  24:               <AppText>{t('workspaceMove.conflictBody')}</AppText>
  25:             </View>
  26:           ) : null}
  27:           {controller.errorKey ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.state.error }]}>{t(controller.errorKey)}</Text> : null}
  29:           <ScrollView contentContainerStyle={styles.choices} horizontal showsHorizontalScrollIndicator={false}>
  30:             {detail?.days.map((day) => {
  31:               const selected = day.id === controller.targetDayId;
  32:               return <Pressable key={day.id} accessibilityLabel={`${t('workspaceMove.targetDay')} ${day.dayNumber}`} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => controller.setTargetDayId(day.id)} ...>
  34:               </Pressable>;
  35:             })}
  36:           </ScrollView>
  38:           <View style={styles.positions}>
  39:             {controller.positions.map((position) => {
  40:               const selected = position === controller.targetPosition;
  41:               return <Pressable key={position} accessibilityLabel={`${t('workspaceMove.position', { number: position })}`} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => controller.setTargetPosition(position)} ...>
  43:               </Pressable>;
  44:             })}
  45:           </View>
  47:             <Pressable ... disabled={controller.saving} onPress={controller.close} ...>...</Pressable>
  48:             <Pressable ... disabled={controller.saving || !controller.mutationReady} onPress={() => { void controller.submit(); }} ...>...</Pressable>
```

The `...` above replaces style-only props on the same physical line; it does not omit any behavioral expression.

### `mobile/src/features/trips/screens/TripDetailScreen.tsx` — production/fixture routing and move wiring

```tsx
  91:   const tripId = route?.params?.tripId;
  92:   const isRemoteTrip = Boolean(tripId && isUuid(tripId));
  93:   const isFixture = Boolean(
  94:     fixtureMode || customTripDetail || (!isRemoteTrip && tripId?.startsWith('trip_'))
  95:   );
  97:   const effectiveRepository = useMemo(() => {
  98:     if (customTripDetail || fixtureMode) return repository;
  99:     return repository ?? (isRemoteTrip ? new SupabaseSavedTripsRepository(supabase) : undefined);
 100:   }, [customTripDetail, fixtureMode, isRemoteTrip, repository]);
 169:   const [status, setStatus] = useState<TripDetailUIStatus>(
 170:     isFixture ? initialStatus : (isRemoteTrip ? 'loading' : 'not_found')
 171:   );
 179:   const workspaceRepository = useMemo(() => injectedWorkspaceRepository ?? new SupabaseTravelWorkspaceRepository(supabase), [injectedWorkspaceRepository]);
 180:   const moveSavedTripsRepository = useMemo(() => effectiveRepository ?? new SupabaseSavedTripsRepository(supabase), [effectiveRepository]);
 181:   const applyAuthoritativeDetail = useCallback((detail: SavedTripDetail | null) => {
 182:     remoteTripDataRef.current = detail ? mapSavedTripDetailToTripDetailData(detail) : null;
 183:     setRemoteSavedDetail(detail);
 184:     setRemoteTripData(remoteTripDataRef.current);
 185:     setStatus(detail ? 'ready' : 'not_found');
 186:   }, []);
 187:   const moveController = useWorkspaceMoveController({
 188:     detail: isRemoteTrip ? remoteSavedDetail : null,
 189:     savedTripsRepository: moveSavedTripsRepository,
 190:     workspaceRepository,
 191:     onAuthoritativeDetail: applyAuthoritativeDetail,
 192:   });
 194:   const loadRemoteDetail = useCallback((showBlockingLoader = true): Promise<boolean> => {
 195:     if (!effectiveRepository || !tripId || !isRemoteTrip) return Promise.resolve(false);
 210:     load = effectiveRepository.getDetail(typedTripId)
 211:       .then((detail) => {
 219:         const mapped = mapSavedTripDetailToTripDetailData(detail);
 220:         remoteTripDataRef.current = mapped;
 221:         setRemoteSavedDetail(detail);
 222:         setRemoteTripData(mapped);
 223:         setStatus('ready');
 240:     remoteLoadRef.current = { tripId, promise: load };
 241:     return load;
 242:   }, [effectiveRepository, tripId, isRemoteTrip]);
 278:       return customTripDetail;
 280:     if (fixtureMode || (!isRemoteTrip && tripId?.startsWith('trip_'))) {
 282:       return getMockTripDetail(tripId ?? 'trip_bangkok');
 284:     if (isRemoteTrip) return remoteTripData;
 346:   const handleMoveOrReorder = useCallback((item: ItineraryItem) => {
 347:     if (isRemoteTrip) moveController.open(item.id);
 348:   }, [isRemoteTrip, moveController]);
 544:               <ItineraryCard
 547:                 item={displayItem}
 550:                 onMoveOrReorder={isRemoteTrip ? handleMoveOrReorder : undefined}
 562:       {isRemoteTrip ? <WorkspaceMoveSheet controller={moveController} detail={remoteSavedDetail} /> : null}
```

### `mobile/src/integration/contracts.ts` — move DTO/result and authoritative read model

```ts
 202: export type UpdateWorkspaceItemCommand = {
 203:   type: 'update_item'; tripId: TripId; itemId: ItineraryItemId; expectedRevision: WorkspaceRevision; patch: WorkspaceItemPatch;
 204: };
 211: export type CreateWorkspaceItemCommand = {
 212:   type: 'create_item'; tripId: TripId; dayId: ItineraryDayId; expectedRevision: WorkspaceRevision; item: CreateCustomActivityPayload;
 213: };
 214: export type MoveWorkspaceItemCommand = {
 215:   type: 'move_item'; tripId: TripId; itemId: ItineraryItemId; expectedRevision: WorkspaceRevision; targetDayId: ItineraryDayId; targetPosition: number;
 216: };
 217: export type WorkspaceMutationCommand = CreateWorkspaceItemCommand | UpdateWorkspaceItemCommand | TransitionWorkspaceItemStatusCommand | ReplaceWorkspaceSourceLinksCommand | MoveWorkspaceItemCommand;
 218: export type WorkspaceMutationResult = { revision: WorkspaceRevision; itemId?: ItineraryItemId; noOp?: boolean };
 252:   itemKind: WorkspaceItemKind;
 253:   flexibility: WorkspaceFlexibility;
 254:   priority: WorkspacePriority;
 255:   activityStatus: WorkspaceActivityStatus;
 256:   placeName: string;
 264: export type UnresolvedSavedTripItem = SavedTripItemBase & {
 265:   resolution: 'UNRESOLVED';
 266:   latitude: null;
 267:   longitude: null;
 270: export type VerifiedSavedTripItem = SavedTripItemBase & {
 271:   resolution: 'VERIFIED';
 272:   googlePlaceId: GooglePlaceId;
 273:   latitude: number;
 274:   longitude: number;
 275:   placeAddress?: string;
 276:   placeCategory?: string;
 277:   placeResolvedAt: string;
 280: export type SavedTripItem = UnresolvedSavedTripItem | VerifiedSavedTripItem;
 282: export type SavedTripDay = {
 283:   id: ItineraryDayId;
 284:   dayNumber: number;
 287:   items: SavedTripItem[];
 290: export type SavedTripDetail = {
 291:   id: TripId;
 299:   /** Optional only for the frozen pre-workspace read contract. Mutations must
 300:    * never infer a revision when this field is absent. */
 301:   workspaceRevision?: WorkspaceRevision;
 302:   days: SavedTripDay[];
```

### `mobile/src/integration/validation.ts` — command/result and contiguous authoritative graph

```ts
 278: export function validateWorkspaceMutationCommand(value: unknown): WorkspaceMutationCommand {
 279:   if (!isRecord(value) || !hasOnlyKeys(value, ['type', 'tripId', 'dayId', 'itemId', 'expectedRevision', 'item', 'patch', 'status', 'links', 'targetDayId', 'targetPosition'])
 280:     || !isUuid(value.tripId) || !Number.isInteger(value.expectedRevision) || typeof value.expectedRevision !== 'number' || value.expectedRevision < 1 || typeof value.type !== 'string') throw new ContractValidationError('workspace mutation command');
 285:   const base = { tripId: value.tripId as TripId, itemId: value.itemId as ItineraryItemId, expectedRevision: value.expectedRevision as number };
 286:   if (value.type === 'move_item' && value.patch === undefined && value.status === undefined && value.links === undefined
 287:     && isUuid(value.targetDayId) && typeof value.targetPosition === 'number' && Number.isInteger(value.targetPosition) && value.targetPosition >= 1) {
 288:     return { type: 'move_item', ...base, targetDayId: value.targetDayId as ItineraryDayId, targetPosition: value.targetPosition };
 289:   }
 297: export function parseWorkspaceMutationResult(value: unknown): WorkspaceMutationResult {
 298:   if (!isRecord(value) || !hasOnlyKeys(value, ['revision', 'itemId', 'noOp']) || !Number.isInteger(value.revision) || typeof value.revision !== 'number' || value.revision < 1 || (value.itemId !== undefined && !isUuid(value.itemId)) || (value.noOp !== undefined && typeof value.noOp !== 'boolean')) throw new ContractValidationError('workspace mutation result');
 299:   return { revision: value.revision as number, ...(value.itemId === undefined ? {} : { itemId: value.itemId as ItineraryItemId }), ...(value.noOp === undefined ? {} : { noOp: value.noOp }) };
 638: function parseSavedTripItem(value: unknown, expectedPosition: number): SavedTripItem {
 639:   if (!isRecord(value)
 640:     || !isUuid(value.id)
 641:     || value.position !== expectedPosition
 642:     || (value.resolution !== 'UNRESOLVED' && value.resolution !== 'VERIFIED')) {
 643:     throw new ContractValidationError('saved trip item');
 669:   if (value.resolution === 'UNRESOLVED') {
 670:     if (value.googlePlaceId !== undefined || value.latitude !== undefined || value.longitude !== undefined
 671:       || value.placeAddress !== undefined || value.placeCategory !== undefined || value.placeResolvedAt !== undefined) {
 672:       throw new ContractValidationError('unresolved saved trip item');
 679:   const latitude = finiteNumber(value.latitude, -90, 90);
 680:   const longitude = finiteNumber(value.longitude, -180, 180);
 681:   const googlePlaceId = requiredString(value.googlePlaceId, 255);
 684:   if (latitude === null || longitude === null || !googlePlaceId || !isIsoTimestamp(value.placeResolvedAt)
 686:     throw new ContractValidationError('verified saved trip item');
 714: function parseSavedTripDay(value: unknown, expectedDay: number, startDate: string): SavedTripDay {
 730:     items: value.items.map((item, index) => parseSavedTripItem(item, index + 1)),
```

### `mobile/src/integration/remote/supabaseTripRepositories.ts` — one mutation RPC, one-attempt policy

```ts
 109: /**
 110:  * FEATURE-P1-T003 write boundary. Mutations are single-attempt CAS commands:
 111:  * a revision conflict is returned to the caller and is never retried/overwritten.
 112:  */
 113: export class SupabaseTravelWorkspaceRepository implements TravelWorkspaceRepository {
 116:   async mutate(command: WorkspaceMutationCommand, signal?: AbortSignal): Promise<WorkspaceMutationResult> {
 117:     const stableCommand = validateWorkspaceMutationCommand(command);
 118:     return executeWithReliability(async (attemptSignal) => {
 119:       const { data, error } = stableCommand.type === 'create_item'
 123:         : stableCommand.type === 'move_item'
 124:           ? await this.client.rpc('move_travel_workspace_item', {
 125:             p_command: stableCommand as unknown as Json,
 126:           }).abortSignal(attemptSignal)
 130:       if (error) throw mapWorkspaceMutationError(error);
 131:       return parseWorkspaceMutationResult(data);
 132:     }, supabaseMutationPolicy, signal);
 133:   }
```

Supporting exact-current policy, `mobile/src/integration/reliability.ts:40-43`:

```ts
  40: export const supabaseMutationPolicy: ReliabilityPolicy = {
  41:   timeoutMs: 10_000,
  42:   maximumAttempts: 1,
  43: };
```

### `supabase/migrations/20260904000000_workspace_p2_t002_atomic_move.sql` — operative lock/CAS/move section

```sql
  51:   -- 1. Optimistically read source day
  52:   select itinerary_day_id into v_source_day_id
  53:   from public.itinerary_items
  54:   where id = v_item_id;
  57:   -- 2. Lock ALL affected items in deterministic UUID order to prevent deadlocks
  59:   perform 1
  60:   from public.itinerary_items
  61:   where itinerary_day_id in (v_source_day_id, v_target_day_id)
  62:   order by id
  63:   for update;
  65:   -- 3. Re-verify the source item is still in v_source_day_id and part of the trip
  66:   select item.itinerary_day_id, item.position into v_current_day_id, v_source_position
  67:   from public.itinerary_items as item
  68:   join public.itinerary_days as day on day.id = item.itinerary_day_id
  69:   where item.id = v_item_id and day.trip_id = v_trip_id;
  71:   if v_current_day_id <> v_source_day_id then
  74:     raise exception 'Workspace revision conflict.' using errcode = 'TW009';
  77:   -- 4. Lock affected days in deterministic UUID order BEFORE the trip.
  79:   perform 1
  80:   from public.itinerary_days
  81:   where trip_id = v_trip_id and id in (v_source_day_id, v_target_day_id)
  82:   order by id
  83:   for update;
  85:   if (select count(*) from public.itinerary_days where trip_id = v_trip_id and id in (v_source_day_id, v_target_day_id))
  86:      <> (case when v_source_day_id = v_target_day_id then 1 else 2 end) then
  87:     raise exception 'Workspace resource was not found.' using errcode = 'TW008';
  90:   -- 5. Finally, lock the trip and check the revision.
  91:   select trip.workspace_revision into v_current_revision
  92:   from public.trips as trip
  93:   where trip.id = v_trip_id and trip.user_id = v_user_id
  94:   for update;
  96:   if v_current_revision <> v_expected_revision then
  97:     raise exception 'Workspace revision conflict.' using errcode = 'TW009';
 100:   select count(*) into v_source_count from public.itinerary_items where itinerary_day_id = v_source_day_id;
 101:   if v_target_day_id = v_source_day_id then
 105:     if v_target_position = v_source_position then
 106:       return jsonb_build_object('revision', v_current_revision, 'noOp', true);
 108:     set constraints itinerary_items_day_position_key deferred;
 109:     update public.itinerary_items
 110:     set position = case
 111:       when id = v_item_id then v_target_position
 112:       when v_source_position < v_target_position and position > v_source_position and position <= v_target_position then position - 1
 113:       when v_source_position > v_target_position and position >= v_target_position and position < v_source_position then position + 1
 114:       else position
 115:     end
 116:     where itinerary_day_id = v_source_day_id;
 117:   else
 118:     select count(*) into v_target_count from public.itinerary_items where itinerary_day_id = v_target_day_id;
 122:     set constraints itinerary_items_day_position_key deferred;
 123:     update public.itinerary_items
 124:     set position = position - 1
 125:     where itinerary_day_id = v_source_day_id and position > v_source_position;
 126:     update public.itinerary_items
 127:     set position = position + 1
 128:     where itinerary_day_id = v_target_day_id and position >= v_target_position;
 129:     update public.itinerary_items
 130:     set itinerary_day_id = v_target_day_id, position = v_target_position
 131:     where id = v_item_id;
 132:   end if;
 134:   select workspace_revision into v_current_revision from public.trips where id = v_trip_id;
 135:   return jsonb_build_object('revision', v_current_revision);
 147: comment on function public.move_travel_workspace_item(jsonb) is
 148:   'FEATURE-P2-T002 SECURITY INVOKER owner-scoped atomic reorder/move. Locks all source/destination items by UUID, then both days by UUID, then trip; compares trips.workspace_revision; preserves stable item identity and provider fields.';
 150: revoke all on function public.move_travel_workspace_item(jsonb) from public, anon;
 151: grant execute on function public.move_travel_workspace_item(jsonb) to authenticated;
```

The function declaration at lines 4-8 is `create function ... language plpgsql security invoker set search_path = pg_catalog, public`.

### `supabase/migrations/20260905000000_workspace_create_item_lock_corrective.sql` — exact lock/CAS/insert section

```sql
  60:     -- CORRECTIVE: Lock day FIRST to match direct writer (day -> trip trigger) lock order
  61:     perform 1 from public.itinerary_days where id = v_day_id and trip_id = v_trip_id for update;
  62:     if not found then raise exception 'Day was not found.' using errcode = 'TW008'; end if;
  64:     select workspace_revision into v_current_revision from public.trips
  65:     where id = v_trip_id and user_id = v_user_id for update;
  66:     if not found then raise exception 'Trip was not found.' using errcode = 'TW008'; end if;
  67:     if v_current_revision <> v_revision then raise exception 'Trip was updated elsewhere.' using errcode = 'TW009'; end if;
  69:     select coalesce(max(position), 0) + 1 into v_position from public.itinerary_items where itinerary_day_id = v_day_id;
  70:     insert into public.itinerary_items(itinerary_day_id, position, place_name, item_kind, flexibility, priority, activity_status, start_time, end_time)
  71:     values (v_day_id, v_position, v_title, 'custom_activity', v_flexibility, v_priority, 'scheduled', v_start, v_end)
  72:     returning id into v_item_id;
  74:     select workspace_revision into v_current_revision from public.trips where id = v_trip_id;
  75:     return jsonb_build_object('itemId', v_item_id, 'revision', v_current_revision);
  84: comment on function public.create_travel_workspace_item(jsonb) is
  85:   'FEATURE-P2-T001 SECURITY INVOKER owner-scoped CAS creation; lock order ensures no deadlocks with trigger-based updates. Only appends CUSTOM_ACTIVITY items; the trip row lock serializes append position and revision.';
```

The declaration at lines 5-9 is `create or replace function ... language plpgsql security invoker set search_path = pg_catalog, public`.

### `supabase/tests/persistence/workspace_move_contract.sql` — identity, provenance, owner and privilege assertions

```sql
  20: set role authenticated;
  21: select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
  23: declare v_revision integer; v_result jsonb; v_before record; v_after record;
  25:   select google_place_id, latitude, longitude, place_address, place_category, place_resolved_at, place_name, item_kind, activity_status into v_before from public.itinerary_items where id=(select value_uuid from workspace_move_state where name='verified');
  27:   v_result := public.move_travel_workspace_item(...'itemId','92000000-0000-4000-8000-000000000024',...'targetPosition',2));
  28:   if (v_result->>'revision')::integer <= v_revision or (select array_agg(place_name order by position) ...) <> array['A','D','B','C'] then raise exception 'Same-day reorder contract failed.'; end if;
  30:   v_result := public.move_travel_workspace_item(...same item/day/position...);
  31:   if v_result->>'noOp' <> 'true' or (v_result->>'revision')::integer <> v_revision then raise exception 'Same-position no-op changed revision.'; end if;
  36:   v_result := public.move_travel_workspace_item(...'itemId',(select value_uuid ... name='move'),...'targetDayId',day2,'targetPosition',2));
  38:   if (select array_agg(position order by position) ... day1) <> array[1,2,3]
  39:      or (select array_agg(position order by position) ... day2) <> array[1,2,3]
  40:      or not exists (select 1 from public.itinerary_items where id=(select value_uuid ... name='move') and itinerary_day_id=day2 and position=2) then raise exception 'Cross-day move did not preserve stable/contiguous graph.'; end if;
  41:   select google_place_id, latitude, longitude, place_address, place_category, place_resolved_at, place_name, item_kind, activity_status into v_after ... name='verified';
  42:   if v_after is distinct from v_before then raise exception 'Move changed verified provider provenance.'; end if;
  45:   v_result := public.move_travel_workspace_item(...'itemId',verified,...'targetDayId',day2,'targetPosition',1));
  47:   select google_place_id, latitude, longitude, place_address, place_category, place_resolved_at, place_name, item_kind, activity_status into v_after ... name='verified';
  48:   if v_after is distinct from v_before or not exists(select 1 from public.itinerary_items where id=verified and itinerary_day_id=day2 and position=1) then raise exception 'Moving verified item changed identity/provenance.'; end if;
  55:   begin perform public.move_travel_workspace_item(...'expectedRevision',v_revision-1...); raise exception 'Expected stale move conflict.';
  56:   exception when sqlstate 'TW009' then null; end;
  59: reset role;
  60: set role authenticated;
  61: select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
  62: do $$ begin begin perform public.move_travel_workspace_item(...); raise exception 'Cross-user move disclosed workspace.'; exception when sqlstate 'TW008' then null; end; end $$;
  64:   if to_regprocedure('public.move_travel_workspace_item(jsonb)') is null or not has_function_privilege('authenticated','public.move_travel_workspace_item(jsonb)','EXECUTE') or has_function_privilege('anon','public.move_travel_workspace_item(jsonb)','EXECUTE') or exists (select 1 from pg_proc where oid='public.move_travel_workspace_item(jsonb)'::regprocedure and prosecdef) then raise exception 'P2 T002 SECURITY INVOKER move RPC privilege contract is invalid.'; end if;
  66: select 'workspace_move_contract_pass' as result;
```

Ellipses in this test excerpt shorten repeated JSON construction and subqueries. The exact unabridged file is beside the production tree at the path named in the heading.

### `supabase/tests/persistence/workspace_direct_writer_concurrency.ps1` — complete concurrency algorithm, lines 1-80

```powershell
   1: # Called by run.ps1 against its isolated fresh database. Never run on remote.
   2: # Observe pg_sleep AFTER the writer has acquired its row, then observe the RPC
   3: # blocked by that writer. Timing alone must not manufacture a concurrency PASS.
   4: foreach ($raceKind in @('move_day', 'move_sibling', 'create_day')) {
  16:   $rowLock = "select id from public.itinerary_days where id='$raceDay' for update;"
  17:   $directWrite = "update public.itinerary_days set summary='Direct writer committed' where id='$raceDay';"
  18:   if ($raceKind -eq 'move_sibling') {
  19:     $rowLock = "select id from public.itinerary_items where id='$raceSibling' for update;"
  20:     $directWrite = "update public.itinerary_items set note='Direct writer committed' where id='$raceSibling';"
  22:   $rpcCall = "public.move_travel_workspace_item(...targetPosition',2))"
  23:   if ($raceKind -eq 'create_day') {
  24:     $rpcCall = "public.create_travel_workspace_item(...create_item...)"
  27: set statement_timeout='20s'; set application_name='t002_${raceKind}_writer';
  30: begin;
  31: $rowLock
  33:   for attempt in 1..150 loop
  34:     select exists(select 1 from pg_stat_activity where application_name='t002_${raceKind}_rpc' and pg_backend_pid()=any(pg_blocking_pids(pid))) into overlap;
  35:     if overlap then exit; end if;
  36:     perform pg_sleep(0.1);
  39:   if not overlap then raise exception 'RPC blocking overlap was not observed'; end if;
  40:   raise notice 'DIRECT_WRITER_OVERLAP_PROVEN';
  42: $directWrite
  44: select 'DIRECT_WRITER_COMMITTED';
  47: set statement_timeout='20s'; set application_name='t002_${raceKind}_rpc';
  51:   begin perform $rpcCall;
  52:     raise exception 'Expected stale RPC conflict';
  53:   exception when sqlstate 'TW009' then raise notice 'DIRECT_WRITER_RPC_CONFLICT'; end;
  59:     for ($poll = 0; $poll -lt 40; $poll++) {
  60:       $probe = & docker exec $container psql ... "select count(*) from pg_stat_activity where application_name='t002_${raceKind}_writer' and wait_event='PgSleep'"
  64:     if (-not $writerObserved) { throw "Writer row lock was not observed: $raceKind" }
  66:     $done = @(Wait-Job -Job $writerJob, $rpcJob -Timeout 25)
  67:     if ($done.Count -ne 2) { throw "Direct writer race exceeded bounded wait: $raceKind" }
  69:     if ($raceOutput -notmatch 'DIRECT_WRITER_OVERLAP_PROVEN' -or $raceOutput -notmatch 'DIRECT_WRITER_COMMITTED' -or $raceOutput -notmatch 'DIRECT_WRITER_RPC_CONFLICT') {
  72:     Invoke-SqlText -Database $freshDb -Sql @"
  74:   if (select workspace_revision from public.trips where id='$raceTrip') <> 5
  75:      or (select array_agg(id order by position) ...) is distinct from array['$raceItem'::uuid,'$raceSibling'::uuid]
  76:      or (select array_agg(position order by position) ...) is distinct from array[1,2]
  77:      or not exists (select 1 from public.itinerary_days where id='$raceDay' and day_number=1)
  78:   then raise exception 'Direct writer final graph/revision/identity assertion failed'; end if;
```

Lines 81-91 then verify the direct field write was retained, emit `workspace_direct_writer_${raceKind}_pass`, remove jobs, and finally emit `workspace_move_direct_writer_concurrency_pass`.

### `supabase/tests/persistence/run.ps1` — harness wiring and bounded move races

```powershell
  50: function Start-ConcurrentSql {
  52:   Start-Job -ScriptBlock {
  54:     $output = $Statement | docker exec -i $ContainerName psql -X -v ON_ERROR_STOP=1 -U postgres -d $DatabaseName 2>&1
  55:     if ($LASTEXITCODE -ne 0) { throw ... }
 165:   # P2-T002: three independent multi-session races cover same-item moves,
 166:   # different-item same-day reorders, and cross-day competition. Each pair
 167:   # starts from its exact initial revision; bounded waits prove no lock cycle.
 183: set statement_timeout = '3000ms'; set role authenticated;
 187:   begin perform public.move_travel_workspace_item(...same item...); raise notice 'MOVE_RACE_SAME=%LABEL%_SUCCESS'; exception when sqlstate 'TW009' then raise notice 'MOVE_RACE_SAME=%LABEL%_TW009'; end;
 188:   begin perform public.move_travel_workspace_item(...different item...); raise notice 'MOVE_RACE_DIFFERENT=%LABEL%_SUCCESS'; exception when sqlstate 'TW009' then raise notice 'MOVE_RACE_DIFFERENT=%LABEL%_TW009'; end;
 189:   begin perform public.move_travel_workspace_item(...cross day...); raise notice 'MOVE_RACE_CROSS=%LABEL%_SUCCESS'; exception when sqlstate 'TW009' then raise notice 'MOVE_RACE_CROSS=%LABEL%_TW009'; end;
 195:   $completedMoveJobs = Wait-Job -Job $moveRaceA, $moveRaceB -Timeout 15
 200:     if (([regex]::Matches($moveOutput, "$race=.*_SUCCESS")).Count -ne 1 -or ([regex]::Matches($moveOutput, "$race=.*_TW009")).Count -ne 1) { throw ... }
 205:   if exists (select 1 from (select itinerary_day_id, position, row_number() over (partition by itinerary_day_id order by position) as expected ...) as ordered where position <> expected) then raise exception 'Move race left non-contiguous positions.'; end if;
 206:   if (select count(*) ... stable IDs ...) then raise exception 'Move race lost or duplicated stable items.'; end if;
 209:   Write-Output 'workspace_move_concurrency_pass'
 567:   . (Join-Path $PSScriptRoot 'workspace_direct_writer_concurrency.ps1')
```

The same harness applies all current migrations to the fresh database before invoking `workspace_move_contract.sql`, the security matrix, ordering matrix, and concurrency blocks; it then executes the upgrade path.

### `mobile/tests/WorkspaceMoveController.test.tsx` — controller acceptance matrix

```tsx
  43: it('sends one cross-day move command, deduplicates pending submit, and refreshes once on success', async () => {
  54:   await fireEvent.press(screen.getByRole('button', { name: 'Save position' }));
  55:   await fireEvent.press(screen.getByRole('button', { name: 'Saving…' }));
  56:   expect(mutate).toHaveBeenCalledTimes(1);
  57:   expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ type: 'move_item', itemId: itemA, targetDayId: dayTwo, targetPosition: 1, expectedRevision: 1 }));
  59:   await waitFor(() => expect(getDetail).toHaveBeenCalledTimes(2));
  64: it('shows conflict message when revision check fails', async () => {
  72:   expect(mutate).toHaveBeenCalledTimes(1);
  73:   expect(getDetail).toHaveBeenCalledTimes(2);
  76: it('does not apply an old mutation response after unmount', async () => {
  84:   await view.unmount();
  86:   expect(getDetail).toHaveBeenCalledTimes(1);
  89: it.each([[0, 2], [1, 1]])('same-day selection %i to position %i sends exactly one command and applies authoritative order', async (index, position) => {
 100:   expect(mutate).toHaveBeenCalledTimes(1);
 102:   expect(screen.getAllByTestId(/^itinerary-item-/).map((node) => node.props.testID)).toEqual([`itinerary-item-${itemB}`, `itinerary-item-${itemA}`]);
 105: it('same-position no-op sends one command without a refresh', async () => {
 112:   expect(mutate).toHaveBeenCalledTimes(1);
 114:   expect(getDetail).toHaveBeenCalledTimes(1);
 118: it('missing revision disables Save and blocks the controller mutation', async () => {
 126:   expect(screen.getByRole('button', { name: 'Save position' })).toBeDisabled();
 128:   expect(mutate).not.toHaveBeenCalled();
 131: it('an old response cannot refetch or replace a later trip view', async () => {
 146:   expect(getDetail).not.toHaveBeenCalled();
 147:   expect(onAuthoritativeDetail).not.toHaveBeenCalled();
 150: it('reordering or moving the same verified items does not request provider images again', async () => {
 162:   expect(getPlaceImage).toHaveBeenCalledTimes(2);
 164:   await view.rerender({ ...initial, days: [{ ...initial.days[0], items: [...initial.days[0].items].reverse() }, initial.days[1]] });
 165:   await view.rerender({ ...initial, days: [{ ...initial.days[0], items: [initial.days[0].items[1]] }, { ...initial.days[1], items: [initial.days[0].items[0]] }] });
 166:   expect(getPlaceImage).toHaveBeenCalledTimes(2);
```

The synthetic VERIFIED objects at lines 151-155 are isolated Jest fixtures. They are not production/runtime rows. No fake VERIFIED row was created in the linked development Supabase environment.

### `phase_doc/PHASES_FEATURES.md` — current roadmap state

```markdown
 236: ### [ ] FEATURE-P2 — Runtime Workspace production
 422: #### [x] FEATURE-P2-T002 — Sắp xếp lại và chuyển ngày
 424: - [x] FEATURE-P2-T002-S001 — Triển khai reorder/move-day atomic với conflict feedback.
 426: ##### Checklist hoàn thành
 428: - [x] Ordering contiguous, stale conflict và regression khi reopen PASS.
 430: #### [ ] FEATURE-P2-T003 — Bỏ qua, hoàn thành và ghi chú
 438: #### [ ] FEATURE-P2-T004 — Form transport, accommodation, contact và source link
 446: #### [ ] FEATURE-P2-T005 — Refresh remote và bằng chứng Android workspace
```

This reviewer-bundle task did not change any checkbox.

## Lock and CAS sequence derived from executable SQL

The executable statements match the required order.

MOVE:

1. Read the source day optimistically.
2. Lock every item row in source/destination days with `ORDER BY id FOR UPDATE`.
3. Revalidate the moved item's current day and trip identity.
4. Lock the affected day rows with `ORDER BY id FOR UPDATE`.
5. Lock the owner-scoped trip row with `FOR UPDATE`.
6. Compare `workspace_revision`; stale input raises `TW009`.
7. Only after those locks/CAS, run same-day bulk renumber or the source renumber, destination renumber, and moved-row update.

CREATE ITEM corrective:

1. Lock the destination day row.
2. Lock the owner-scoped trip row.
3. Compare `workspace_revision`; stale input raises `TW009`.
4. Compute append position and insert the new custom activity.

No difference was found between this summary and current migrations.

## Security, identity, provenance and scale audit

- No delete/recreate move: the MOVE function contains only `UPDATE` statements for item movement. The moved row is updated by `where id = v_item_id`; it is never deleted or inserted.
- Stable UUID: SQL contract asserts the same stored ID at the destination, concurrency tests assert no lost/duplicated IDs, and Android evidence retains `a89559da-6845-4a79-a614-4cf793063c27`.
- No automatic retry amplification: `supabaseMutationPolicy.maximumAttempts = 1`; the controller issues one `mutate` call and does not replay after `TW009`.
- Owner/RLS model preserved: both SQL functions are `SECURITY INVOKER`; ownership is resolved with `auth.uid()` and the trip lock is constrained by `trip.user_id = v_user_id`. The contract switches authenticated JWT subjects and requires the cross-user request to fail with `TW008`. Execute is revoked from `public, anon` and granted to `authenticated` for MOVE.
- Provider provenance preserved: MOVE updates only `itinerary_day_id` and `position`. The SQL contract snapshots and compares provider-owned fields before and after moving both another item and the VERIFIED item itself.
- No fake VERIFIED production data: exact-current Android used a real saved trip and an UNRESOLVED item. No provider row, coordinate, ID, rating, or provenance was fabricated. Synthetic provider values occur only inside isolated tests.
- No full graph rewrite: same-day update is limited to one affected day; cross-day updates are limited to the source/destination day ranges plus the single moved row. The RPC does not replace the trip graph.
- No N+1 introduced: one move RPC is followed by at most one authoritative `getDetail` RPC on success or conflict. The mutation does not loop over rows from the client. Database work uses set-based updates against the two bounded affected days.

## Raw/final command result evidence

### Fresh exact-current typecheck

Raw source: `typecheck.log`, written 2026-09-06 15:32:15 UTC.

```text
> tripwise-mobile@1.0.0 typecheck
> tsc --noEmit

EXIT_CODE=0
```

Result: `TYPECHECK_EXACT_CURRENT = PASS`.

### Focused Jest

Raw source: `../p2-t002-20260905/focused-closure.log`, written 2026-09-06 15:16:52 UTC.

```text
> jest --runInBand tests/WorkspaceMoveController.test.tsx
PASS tests/WorkspaceMoveController.test.tsx
Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Snapshots:   0 total
Time:        4.689 s
```

Result: `FOCUSED_JEST = PASS (9/9)`.

### Full Jest

Raw source: `../p2-t002-20260905/jest-full-closure.log`, written 2026-09-06 15:17:56 UTC.

```text
Test Suites: 1 skipped, 63 passed, 63 of 64 total
Tests:       1 skipped, 450 passed, 451 total
Snapshots:   0 total
Time:        58.387 s, estimated 62 s
Ran all test suites.
```

Result: `FULL_JEST = PASS (63 suites / 450 tests; 1 suite/test skipped)`.

### Lint

Raw source: `../p2-t002-20260905/lint-final.log`, written 2026-09-06 15:07:47 UTC.

```text
> tripwise-mobile@1.0.0 lint
> expo lint
✖ 12 problems (0 errors, 12 warnings)
  0 errors and 5 warnings potentially fixable with the --fix option.
```

Result: `LINT = PASS_WITH_WARNINGS (0 errors, 12 warnings)`.

### Persistence/Docker and concurrency

Raw source: `../p2-t002-20260905/docker.log`, written 2026-09-05 00:18:14 UTC.

```text
fresh_contract_pass
workspace_move_contract_pass
workspace_create_item_concurrency_pass
workspace_move_concurrency_pass
workspace_lock_order_concurrency_pass
workspace_source_link_lock_order_concurrency_pass
workspace_direct_writer_move_day_pass
workspace_direct_writer_move_sibling_pass
workspace_direct_writer_create_day_pass
workspace_move_direct_writer_concurrency_pass
upgrade_compatibility_pass
PERSISTENCE_TESTS_PASS
```

The direct-writer test deliberately establishes the first row lock, observes `wait_event='PgSleep'`, proves the RPC is blocked through `pg_blocking_pids`, applies bounded statement/job timeouts, then validates final revision, ordering, identity and direct-write content.

### Expo Doctor

Raw source: `../p2-t002-20260905/expo-doctor-final.log`, written 2026-09-06 15:07:41 UTC.

```text
Running 21 checks on your project...
20/21 checks passed. 1 checks failed.
Check that packages match versions required by installed Expo SDK
5 packages out of date.
```

Classification:

```text
EXPO_DOCTOR_BASELINE=YES
EXPO_DOCTOR_T002_REGRESSION=NO
```

The five patch mismatches are the recorded project baseline. No dependency was changed for T002 closure or this reviewer bundle.

### Remote migration state

Raw source: `../p2-t002-20260905/remote-migration-list.log`, written 2026-09-06 15:06:19 UTC.

```text
local=20260904000000 remote=20260904000000 time=2026-09-04 00:00:00
local=20260905000000 remote=20260905000000 time=2026-09-05 00:00:00
message=Migrations listed
```

No migration was deployed or reapplied during exact-current closure or this reviewer bundle.

## Android exact-current evidence index

All timestamps below are UTC and come from the local filesystem evidence artifacts.

### Device and current Metro bundle

- `android-device.log`: `device`, 2026-09-06 15:33:15 UTC.
- `metro-current-bundle.log`: reload requested at `2026-09-06T15:33:15.1987422Z`; packager running; mobile environment matched linked Supabase project.
- `android-log.txt`: `ReactNativeJS Running "main"` at device-local 22:33:20, corresponding to 15:33:20 UTC, after the reload request.
- `metro-connected-app.json`: `com.anonymous.tripwisemobile`, Android API 37 emulator, React Native Bridgeless connection.
- `metro-source-match.json`: exact Metro source content matched current disk for validation, Supabase repository, TripDetailScreen, WorkspaceMoveSheet and useWorkspaceMoveController.
- `02-reloaded.xml`: post-reload Home screen, 2026-09-06 15:33:33 UTC.

### Same-day reorder

- `03-before-same.xml` — 15:35:22: Day 1 before mutation; Asakusa UUID `a89559da-6845-4a79-a614-4cf793063c27` at position 1.
- `04-same-sheet.xml` — 15:35:42: Day 1 selected; original position 1 selected.
- `05-same-selected.xml` — 15:36:03: different same-day position selected.
- `06-same-saved.xml` and `.png` — 15:36:32/33: authoritative post-save order has Skytree first and Asakusa second.
- `07-left-same.xml` — 15:36:52: Trip Detail fully left to Home.
- `08-same-reopen.xml` and `.png` — 15:37:10: Home-to-trip reopen preserves Asakusa at Day 1 position 2 with the same UUID.

Result: `ANDROID_SAME_DAY_REORDER_EXACT_CURRENT = PASS`.

### Cross-day move

- `09-cross-sheet.xml` — 15:37:33: Asakusa selected from Day 1 position 2.
- `10-cross-day-selected.xml` — 15:37:53: destination Day 2 selected.
- `11-cross-position-selected.xml` — 15:38:13: explicit destination position 1 selected.
- `12-cross-source.xml` and `.png` — 15:38:16: post-save Day 1 no longer contains Asakusa and contains three contiguous items.
- `13-cross-destination.xml` and `.png` — 15:38:40: Day 2 begins with Asakusa using the same UUID.

Result: `ANDROID_CROSS_DAY_MOVE_EXACT_CURRENT = PASS`.

### Full Home-to-reopen persistence

- `14-left-cross.xml` — 15:38:43: Trip Detail fully left to Home.
- `15-reopen-source.xml` — 15:39:02: reopened Day 1 contains three items and does not contain Asakusa.
- `16-reopen-destination.xml` and `.png` — 15:39:04: reopened Day 2 starts with Asakusa.
- `17-reopen-position-proof.xml` — 15:39:33: reopened move sheet explicitly shows Day 2 and position 1 selected.
- `19-destination-all-items.xml` — 15:40:48: all six destination item UUIDs recorded; Asakusa is first.
- `runtime-assertions.json` — 15:42:10: exact source/destination arrays and moved UUID recorded.

The current transport validator rejects any authoritative day whose item `position` differs from `index + 1`. The reopened graph rendered successfully, so the full source and destination arrays passed the contiguous-position check.

```text
MOVED_ITEM_UUID=a89559da-6845-4a79-a614-4cf793063c27
FINAL_DAY=2
FINAL_POSITION=1
ANDROID_REOPEN_PERSISTENCE_EXACT_CURRENT=PASS
ANDROID_PROVIDER_PROVENANCE=NOT_AVAILABLE
```

The runtime item was UNRESOLVED, so no fake provider row was created. The isolated persistence contract remains the provenance regression evidence because both migration hashes remain exact-current.

## Final closure declarations

```text
PRODUCTION_SOURCE_CHANGED=NO
TEST_SOURCE_CHANGED=NO
MIGRATION_CHANGED=NO
DEPENDENCIES_CHANGED=NO
ROADMAP_CHANGED=NO
T003_STARTED=NO
ANIMATION_STARTED=NO
CREATE_TRIP_GENERATION_MOTION=PAUSED_BY_USER
```

STOP after this evidence bundle. Do not begin FEATURE-P2-T003.
