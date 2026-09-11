import type {
  ItineraryItemId,
  SavedTripDay,
  SavedTripDetail,
  SavedTripItem,
  TripId,
  UserId,
  WorkspaceRevision,
} from './contracts';
import { evaluatePlanConstraints, type ConstraintConflict } from './deterministicConstraintEngine';
import { IntegrationError, mapUnknownTransportError } from './errors';
import type { SavedTripsRepository } from './repositories';
import { isUuid, parseSavedTripDetail } from './validation';

export type TripRefreshChangeKind =
  | 'retained'
  | 'moved'
  | 'added'
  | 'removed'
  | 'scheduling_time_changed'
  | 'metadata_changed';

export type TripRefreshItemLocation = {
  dayId: SavedTripDay['id'];
  dayNumber: number;
  position: number;
  startTime: string | null;
  endTime: string | null;
};

export type TripRefreshItemDiff = {
  itemId: ItineraryItemId;
  changeKinds: readonly TripRefreshChangeKind[];
  before: TripRefreshItemLocation | null;
  after: TripRefreshItemLocation | null;
  changedMetadataFields: readonly string[];
};

export type TripRefreshDiff = {
  isNoOp: boolean;
  items: readonly TripRefreshItemDiff[];
};

/**
 * The only persisted T004 mutation surface. All provider-owned, lifecycle,
 * field-kind and source-link fields stay in the authoritative workspace.
 */
export type TripRefreshScheduleMutationItem = {
  itemId: ItineraryItemId;
  dayId: SavedTripDay['id'];
  position: number;
};

export type TripRefreshScheduleMutation = {
  items: readonly TripRefreshScheduleMutationItem[];
};

export type TripRefreshStage = {
  stage: 'route_aware' | 'weather_aware' | 'caller_provided';
  outcome: string;
};

export type RefreshSessionContext = {
  ownerId: UserId;
  /** Opaque identity for the current authenticated session. Never a bearer token. */
  sessionId: string;
};

export type TripRefreshProposal = {
  proposalId: string;
  confirmationId: string;
  tripId: TripId;
  ownerId: UserId;
  sessionId: string;
  baselineWorkspaceRevision: WorkspaceRevision;
  createdAt: string;
  status: 'confirmable';
  baseline: Readonly<SavedTripDetail>;
  proposed: Readonly<SavedTripDetail>;
  diff: TripRefreshDiff;
  mutation: Readonly<TripRefreshScheduleMutation>;
  stages: readonly TripRefreshStage[];
};

export type TripRefreshProposalResult =
  | { status: 'ready' | 'no_op'; proposal: TripRefreshProposal; conflicts: readonly [] }
  | { status: 'invalid_input'; proposal: null; conflicts: readonly ConstraintConflict[] }
  | { status: 'invalid_proposal'; proposal: null; conflicts: readonly [] }
  | { status: 'protected_constraint_conflict'; proposal: null; conflicts: readonly ConstraintConflict[] }
  | { status: 'cancelled' | 'superseded'; proposal: null; conflicts: readonly [] };

export type CreateTripRefreshProposalInput = {
  session: RefreshSessionContext;
  baseline: SavedTripDetail;
  proposed: SavedTripDetail;
  /** Injected timestamp. Proposal generation never reads the current clock. */
  createdAt: string;
  stages?: readonly TripRefreshStage[];
};

export type ConfirmTripRefreshCommand = {
  proposalId: string;
  confirmationId: string;
  tripId: TripId;
  expectedBaselineRevision: WorkspaceRevision;
};

export type AtomicTripRefreshApplyCommand = {
  proposalId: string;
  confirmationId: string;
  idempotencyKey: string;
  tripId: TripId;
  expectedRevision: WorkspaceRevision;
  reviewedMutation: Readonly<TripRefreshScheduleMutation>;
};

export type AtomicTripRefreshApplyResult = {
  revision: WorkspaceRevision;
  noOp?: boolean;
};

/**
 * Required production persistence primitive for T004 application. Implementations
 * must enforce owner/RLS, expectedRevision CAS and confirmation idempotency in one
 * server transaction. TravelWorkspaceRepository.mutate() does not satisfy this port.
 */
export interface AtomicTripRefreshApplyRepository {
  applyReviewedProposal(
    command: AtomicTripRefreshApplyCommand,
    signal?: AbortSignal,
  ): Promise<AtomicTripRefreshApplyResult>;
}

export type TripRefreshConfirmResult =
  | { status: 'success'; proposalId: string; revision: WorkspaceRevision; mutationCount: 1 }
  | { status: 'no_op'; proposalId: string; revision: WorkspaceRevision; mutationCount: 0 }
  | { status: 'proposal_already_applied'; proposalId: string; revision: WorkspaceRevision; mutationCount: 0 }
  | { status: 'invalid_confirmation' | 'protected_constraint_conflict' | 'stale_baseline_revision' | 'proposal_not_found' | 'cancelled' | 'persistence_failure'; proposalId: string; mutationCount: 0 };

export const TRIP_REFRESH_BOUNDS = {
  maxStages: 8,
  maxOpenProposals: 32,
  maxScheduleItems: 400,
} as const;

type LocatedItem = { item: SavedTripItem; location: TripRefreshItemLocation };

const CHANGE_ORDER: readonly TripRefreshChangeKind[] = [
  'retained', 'moved', 'added', 'removed', 'scheduling_time_changed', 'metadata_changed',
];

const METADATA_FIELDS = [
  'itemKind', 'flexibility', 'priority', 'activityStatus', 'placeName', 'placeQuery', 'note',
  'contact', 'transport', 'accommodation', 'sourceLinks', 'resolution', 'googlePlaceId',
  'latitude', 'longitude', 'placeAddress', 'placeCategory', 'placeResolvedAt',
] as const;

function ordinalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}

function isValidSession(session: RefreshSessionContext): boolean {
  return isUuid(session?.ownerId)
    && typeof session.sessionId === 'string'
    && session.sessionId.length >= 8
    && session.sessionId.length <= 128
    && /^[A-Za-z0-9._:-]+$/.test(session.sessionId);
}

function stableValue(value: unknown): string {
  if (value === undefined) return 'u';
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort(ordinalCompare).map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`).join(',')}}`;
}

function stableFingerprint(value: unknown): string {
  const input = stableValue(value);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ code, 0x85ebca6b) >>> 0;
  }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

function locateItems(detail: SavedTripDetail): Map<string, LocatedItem> {
  const items = new Map<string, LocatedItem>();
  detail.days.forEach((day) => day.items.forEach((item) => {
    items.set(item.id, {
      item,
      location: {
        dayId: day.id,
        dayNumber: day.dayNumber,
        position: item.position,
        startTime: item.startTime ?? null,
        endTime: item.endTime ?? null,
      },
    });
  }));
  return items;
}

function metadataChanges(before: SavedTripItem, after: SavedTripItem): string[] {
  const beforeRecord = before as unknown as Record<string, unknown>;
  const afterRecord = after as unknown as Record<string, unknown>;
  return METADATA_FIELDS
    .filter((field) => stableValue(beforeRecord[field]) !== stableValue(afterRecord[field]))
    .map(String)
    .sort(ordinalCompare);
}

function hasConfirmedReservation(item: SavedTripItem): boolean {
  return typeof item.contact?.reservationCode === 'string'
    && item.contact.reservationCode.trim().length > 0;
}

/** Bound workspace records have an existing user commitment and cannot move. */
function isBoundScheduleItem(item: SavedTripItem): boolean {
  return item.flexibility === 'fixed'
    || item.startTime != null
    || item.endTime != null
    || item.itemKind === 'transport'
    || item.itemKind === 'accommodation'
    || item.itemKind === 'reservation'
    || item.activityStatus === 'completed'
    || item.activityStatus === 'skipped'
    || hasConfirmedReservation(item);
}

function hasSupportedScheduleOnlyMutation(
  baseline: SavedTripDetail,
  diff: TripRefreshDiff,
): boolean {
  const baselineItems = locateItems(baseline);
  if (baselineItems.size > TRIP_REFRESH_BOUNDS.maxScheduleItems) return false;
  return diff.items.every((change) => {
    if (change.changeKinds.includes('added')
      || change.changeKinds.includes('removed')
      || change.changeKinds.includes('scheduling_time_changed')
      || change.changeKinds.includes('metadata_changed')) return false;
    const existing = baselineItems.get(change.itemId);
    if (!existing) return false;
    if (change.changeKinds.includes('moved') && isBoundScheduleItem(existing.item)) return false;
    return true;
  });
}

function toScheduleMutation(proposed: SavedTripDetail): TripRefreshScheduleMutation {
  return deepFreeze({
    items: [...locateItems(proposed).values()]
      .map(({ item, location }) => ({ itemId: item.id, dayId: location.dayId, position: location.position }))
      .sort((left, right) => ordinalCompare(left.itemId, right.itemId)),
  });
}

function isOpaqueIdempotencyKey(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 8
    && value.length <= 128
    && /^[A-Za-z0-9._:-]+$/.test(value);
}

/** Boundary validation shared by the production RPC adapter and focused tests. */
export function validateAtomicTripRefreshApplyCommand(
  command: AtomicTripRefreshApplyCommand,
): AtomicTripRefreshApplyCommand {
  const record = command as unknown as Record<string, unknown>;
  if (!record || typeof record !== 'object'
    || Object.keys(record).some((key) => ![
      'proposalId', 'confirmationId', 'idempotencyKey', 'tripId', 'expectedRevision', 'reviewedMutation',
    ].includes(key))
    || !isOpaqueIdempotencyKey(command.proposalId)
    || !isOpaqueIdempotencyKey(command.confirmationId)
    || command.idempotencyKey !== command.confirmationId
    || !isOpaqueIdempotencyKey(command.idempotencyKey)
    || !isUuid(command.tripId)
    || !Number.isInteger(command.expectedRevision)
    || command.expectedRevision < 1
    || !command.reviewedMutation
    || typeof command.reviewedMutation !== 'object') {
    throw new IntegrationError('invalidRequest');
  }
  const mutation = command.reviewedMutation as unknown as Record<string, unknown>;
  if (Object.keys(mutation).some((key) => key !== 'items')
    || !Array.isArray(mutation.items)
    || mutation.items.length < 1
    || mutation.items.length > TRIP_REFRESH_BOUNDS.maxScheduleItems) {
    throw new IntegrationError('invalidRequest');
  }
  const seenItems = new Set<string>();
  for (const value of mutation.items) {
    const item = value as Record<string, unknown>;
    if (!item || typeof item !== 'object'
      || Object.keys(item).some((key) => !['itemId', 'dayId', 'position'].includes(key))
      || !isUuid(item.itemId)
      || !isUuid(item.dayId)
      || !Number.isInteger(item.position)
      || (item.position as number) < 1
      || seenItems.has(item.itemId as string)) {
      throw new IntegrationError('invalidRequest');
    }
    seenItems.add(item.itemId as string);
  }
  return deepFreeze({
    ...command,
    reviewedMutation: {
      items: mutation.items.map((item) => ({
        itemId: (item as TripRefreshScheduleMutationItem).itemId,
        dayId: (item as TripRefreshScheduleMutationItem).dayId,
        position: (item as TripRefreshScheduleMutationItem).position,
      })).sort((left, right) => ordinalCompare(left.itemId, right.itemId)),
    },
  });
}

export function createTripRefreshDiff(
  baseline: SavedTripDetail,
  proposed: SavedTripDetail,
): TripRefreshDiff {
  const beforeItems = locateItems(baseline);
  const afterItems = locateItems(proposed);
  const itemIds = [...new Set([...beforeItems.keys(), ...afterItems.keys()])].sort(ordinalCompare);
  const items = itemIds.map((itemId) => {
    const before = beforeItems.get(itemId);
    const after = afterItems.get(itemId);
    const kinds: TripRefreshChangeKind[] = [];
    let changedMetadataFields: string[] = [];
    if (!before) kinds.push('added');
    else if (!after) kinds.push('removed');
    else {
      if (before.location.dayId !== after.location.dayId
        || before.location.dayNumber !== after.location.dayNumber
        || before.location.position !== after.location.position) kinds.push('moved');
      if (before.location.startTime !== after.location.startTime
        || before.location.endTime !== after.location.endTime) kinds.push('scheduling_time_changed');
      changedMetadataFields = metadataChanges(before.item, after.item);
      if (changedMetadataFields.length > 0) kinds.push('metadata_changed');
      if (kinds.length === 0) kinds.push('retained');
    }
    return {
      itemId: itemId as ItineraryItemId,
      changeKinds: kinds.sort((left, right) => CHANGE_ORDER.indexOf(left) - CHANGE_ORDER.indexOf(right)),
      before: before?.location ?? null,
      after: after?.location ?? null,
      changedMetadataFields,
    };
  });
  return deepFreeze({
    isNoOp: items.every((item) => item.changeKinds.length === 1 && item.changeKinds[0] === 'retained'),
    items,
  });
}

function hasStableEnvelope(baseline: SavedTripDetail, proposed: SavedTripDetail): boolean {
  const baselineEnvelope = {
    id: baseline.id, title: baseline.title, destination: baseline.destination,
    startDate: baseline.startDate, endDate: baseline.endDate,
    estimatedBudget: baseline.estimatedBudget, currency: baseline.currency,
    createdAt: baseline.createdAt, updatedAt: baseline.updatedAt,
  };
  const proposedEnvelope = {
    id: proposed.id, title: proposed.title, destination: proposed.destination,
    startDate: proposed.startDate, endDate: proposed.endDate,
    estimatedBudget: proposed.estimatedBudget, currency: proposed.currency,
    createdAt: proposed.createdAt, updatedAt: proposed.updatedAt,
  };
  if (stableValue(baselineEnvelope) !== stableValue(proposedEnvelope)) return false;
  if (proposed.workspaceRevision !== undefined && proposed.workspaceRevision !== baseline.workspaceRevision) return false;
  if (baseline.days.length !== proposed.days.length) return false;
  return baseline.days.every((day, index) => {
    const candidate = proposed.days[index];
    return candidate !== undefined
      && day.id === candidate.id
      && day.dayNumber === candidate.dayNumber
      && (day.date ?? null) === (candidate.date ?? null)
      && (day.summary ?? null) === (candidate.summary ?? null);
  });
}

export function createTripRefreshProposal(
  input: CreateTripRefreshProposalInput,
): TripRefreshProposalResult {
  if (!isValidSession(input.session) || !isValidTimestamp(input.createdAt)) {
    return { status: 'invalid_input', proposal: null, conflicts: [] };
  }

  const baselineConstraints = evaluatePlanConstraints(input.baseline);
  if (!baselineConstraints.isValid) {
    return { status: 'invalid_input', proposal: null, conflicts: baselineConstraints.conflicts };
  }
  if (!Number.isInteger(input.baseline.workspaceRevision) || (input.baseline.workspaceRevision ?? 0) < 1) {
    return { status: 'invalid_input', proposal: null, conflicts: [] };
  }

  const proposalConstraints = evaluatePlanConstraints(input.proposed, input.baseline);
  if (!proposalConstraints.isValid) {
    const malformed = proposalConstraints.conflicts.some((conflict) =>
      conflict.origin === 'proposed'
      && (conflict.code === 'MALFORMED_INPUT' || conflict.code === 'DUPLICATE_ITEM_ID'));
    if (malformed) return { status: 'invalid_proposal', proposal: null, conflicts: [] };
    return { status: 'protected_constraint_conflict', proposal: null, conflicts: proposalConstraints.conflicts };
  }

  let baseline: SavedTripDetail;
  let proposed: SavedTripDetail;
  try {
    const parsedBaseline = parseSavedTripDetail(input.baseline);
    const parsedProposed = parseSavedTripDetail(input.proposed);
    if (!parsedBaseline || !parsedProposed) {
      return { status: 'invalid_input', proposal: null, conflicts: [] };
    }
    baseline = parsedBaseline;
    proposed = parsedProposed;
  } catch {
    return { status: 'invalid_input', proposal: null, conflicts: [] };
  }
  if (!hasStableEnvelope(baseline, proposed)) {
    return { status: 'invalid_proposal', proposal: null, conflicts: [] };
  }

  const stages = [...(input.stages ?? [])];
  if (stages.length > TRIP_REFRESH_BOUNDS.maxStages
    || stages.some((stage) => !['route_aware', 'weather_aware', 'caller_provided'].includes(stage.stage)
    || typeof stage.outcome !== 'string' || stage.outcome.length < 1 || stage.outcome.length > 80)) {
    return { status: 'invalid_input', proposal: null, conflicts: [] };
  }
  const diff = createTripRefreshDiff(baseline, proposed);
  if (!hasSupportedScheduleOnlyMutation(baseline, diff)) {
    return { status: 'invalid_proposal', proposal: null, conflicts: [] };
  }
  const mutation = toScheduleMutation(proposed);
  const identity = {
    ownerId: input.session.ownerId,
    sessionId: input.session.sessionId,
    tripId: baseline.id,
    baselineWorkspaceRevision: baseline.workspaceRevision,
    proposed,
    diff,
    mutation,
    stages,
  };
  const fingerprint = stableFingerprint(identity);
  const proposalId = `refresh-v1-${fingerprint}`;
  const confirmationId = `confirm-v1-${stableFingerprint({ proposalId, fingerprint })}`;
  const proposal: TripRefreshProposal = deepFreeze({
    proposalId,
    confirmationId,
    tripId: baseline.id,
    ownerId: input.session.ownerId,
    sessionId: input.session.sessionId,
    baselineWorkspaceRevision: baseline.workspaceRevision as WorkspaceRevision,
    createdAt: input.createdAt,
    status: 'confirmable',
    baseline,
    proposed,
    diff,
    mutation,
    stages,
  });
  return { status: diff.isNoOp ? 'no_op' : 'ready', proposal, conflicts: [] };
}

export type TripRefreshCandidateBuilder = (signal: AbortSignal) => Promise<{
  proposed: SavedTripDetail;
  stages?: readonly TripRefreshStage[];
}>;

export class LatestTripRefreshProposalGenerator {
  private generation = 0;
  private active: AbortController | null = null;

  async generate(
    input: Omit<CreateTripRefreshProposalInput, 'proposed' | 'stages'>,
    buildCandidate: TripRefreshCandidateBuilder,
    signal?: AbortSignal,
  ): Promise<TripRefreshProposalResult> {
    this.active?.abort();
    const generation = ++this.generation;
    const controller = new AbortController();
    this.active = controller;
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    try {
      if (controller.signal.aborted) return { status: 'cancelled', proposal: null, conflicts: [] };
      const candidate = await buildCandidate(controller.signal);
      if (generation !== this.generation) return { status: 'superseded', proposal: null, conflicts: [] };
      if (controller.signal.aborted) return { status: 'cancelled', proposal: null, conflicts: [] };
      return createTripRefreshProposal({ ...input, ...candidate });
    } catch (error) {
      const mapped = mapUnknownTransportError(error);
      if (controller.signal.aborted || mapped.code === 'cancelled') {
        return { status: generation === this.generation ? 'cancelled' : 'superseded', proposal: null, conflicts: [] };
      }
      return { status: 'invalid_proposal', proposal: null, conflicts: [] };
    } finally {
      signal?.removeEventListener('abort', abort);
      if (generation === this.generation) this.active = null;
    }
  }

  cancel(): void {
    this.active?.abort();
  }
}

type AppliedRecord = { revision: WorkspaceRevision; noOp: boolean };

export class TripRefreshCoordinator {
  private readonly proposals = new Map<string, TripRefreshProposal>();
  private readonly applied = new Map<string, AppliedRecord>();
  private readonly inFlight = new Map<string, Promise<TripRefreshConfirmResult>>();
  private readonly confirmationControllers = new Map<string, AbortController>();

  constructor(
    private readonly savedTrips: SavedTripsRepository,
    private readonly applyRepository: AtomicTripRefreshApplyRepository,
  ) {}

  open(input: CreateTripRefreshProposalInput): TripRefreshProposalResult {
    const result = createTripRefreshProposal(input);
    if (result.proposal) {
      if (!this.proposals.has(result.proposal.proposalId)
        && this.proposals.size >= TRIP_REFRESH_BOUNDS.maxOpenProposals) {
        const oldestProposalId = this.proposals.keys().next().value as string | undefined;
        if (oldestProposalId) {
          this.confirmationControllers.get(oldestProposalId)?.abort();
          this.proposals.delete(oldestProposalId);
          this.applied.delete(oldestProposalId);
        }
      }
      this.proposals.set(result.proposal.proposalId, result.proposal);
    }
    return result;
  }

  clearSession(session: RefreshSessionContext): void {
    for (const [proposalId, proposal] of this.proposals) {
      if (proposal.ownerId === session.ownerId && proposal.sessionId === session.sessionId) {
        this.confirmationControllers.get(proposalId)?.abort();
        this.proposals.delete(proposalId);
        this.applied.delete(proposalId);
      }
    }
  }

  confirm(
    command: ConfirmTripRefreshCommand,
    session: RefreshSessionContext,
    signal?: AbortSignal,
  ): Promise<TripRefreshConfirmResult> {
    const proposal = this.proposals.get(command.proposalId);
    if (!proposal) return Promise.resolve({ status: 'proposal_not_found', proposalId: command.proposalId, mutationCount: 0 });
    if (!isValidSession(session)
      || proposal.ownerId !== session.ownerId
      || proposal.sessionId !== session.sessionId
      || proposal.confirmationId !== command.confirmationId
      || proposal.tripId !== command.tripId
      || proposal.baselineWorkspaceRevision !== command.expectedBaselineRevision) {
      return Promise.resolve({ status: 'invalid_confirmation', proposalId: command.proposalId, mutationCount: 0 });
    }
    const prior = this.applied.get(proposal.proposalId);
    if (prior) {
      return Promise.resolve({
        status: 'proposal_already_applied', proposalId: proposal.proposalId,
        revision: prior.revision, mutationCount: 0,
      });
    }
    const pending = this.inFlight.get(proposal.proposalId);
    if (pending) return pending;
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    this.confirmationControllers.set(proposal.proposalId, controller);
    const operation = this.confirmOnce(proposal, controller.signal).finally(() => {
      signal?.removeEventListener('abort', abort);
      this.inFlight.delete(proposal.proposalId);
      this.confirmationControllers.delete(proposal.proposalId);
    });
    this.inFlight.set(proposal.proposalId, operation);
    return operation;
  }

  private async confirmOnce(
    proposal: TripRefreshProposal,
    signal?: AbortSignal,
  ): Promise<TripRefreshConfirmResult> {
    if (signal?.aborted) return { status: 'cancelled', proposalId: proposal.proposalId, mutationCount: 0 };
    const finalConstraints = evaluatePlanConstraints(proposal.proposed, proposal.baseline);
    if (!finalConstraints.isValid) {
      return { status: 'protected_constraint_conflict', proposalId: proposal.proposalId, mutationCount: 0 };
    }
    let authoritative: SavedTripDetail | null;
    try {
      authoritative = await this.savedTrips.getDetail(proposal.tripId, signal);
    } catch (error) {
      const mapped = mapUnknownTransportError(error);
      return {
        status: mapped.code === 'cancelled' ? 'cancelled' : 'persistence_failure',
        proposalId: proposal.proposalId,
        mutationCount: 0,
      };
    }
    if (signal?.aborted) return { status: 'cancelled', proposalId: proposal.proposalId, mutationCount: 0 };
    if (!authoritative
      || authoritative.id !== proposal.tripId
      || authoritative.workspaceRevision !== proposal.baselineWorkspaceRevision) {
      return { status: 'stale_baseline_revision', proposalId: proposal.proposalId, mutationCount: 0 };
    }
    if (proposal.diff.isNoOp) {
      const result: AppliedRecord = { revision: proposal.baselineWorkspaceRevision, noOp: true };
      this.applied.set(proposal.proposalId, result);
      return { status: 'no_op', proposalId: proposal.proposalId, revision: result.revision, mutationCount: 0 };
    }
    try {
      const applied = await this.applyRepository.applyReviewedProposal({
        proposalId: proposal.proposalId,
        confirmationId: proposal.confirmationId,
        idempotencyKey: proposal.confirmationId,
        tripId: proposal.tripId,
        expectedRevision: proposal.baselineWorkspaceRevision,
        reviewedMutation: proposal.mutation,
      }, signal);
      if (signal?.aborted || !this.proposals.has(proposal.proposalId)) {
        return { status: 'cancelled', proposalId: proposal.proposalId, mutationCount: 0 };
      }
      if (!Number.isInteger(applied.revision)
        || (applied.noOp === true
          ? applied.revision !== proposal.baselineWorkspaceRevision
          : applied.revision <= proposal.baselineWorkspaceRevision)) {
        return { status: 'persistence_failure', proposalId: proposal.proposalId, mutationCount: 0 };
      }
      const record: AppliedRecord = { revision: applied.revision, noOp: applied.noOp === true };
      this.applied.set(proposal.proposalId, record);
      return applied.noOp
        ? { status: 'no_op', proposalId: proposal.proposalId, revision: applied.revision, mutationCount: 0 }
        : { status: 'success', proposalId: proposal.proposalId, revision: applied.revision, mutationCount: 1 };
    } catch (error) {
      const mapped = error instanceof IntegrationError ? error : mapUnknownTransportError(error);
      if (mapped.code === 'conflict') {
        return { status: 'stale_baseline_revision', proposalId: proposal.proposalId, mutationCount: 0 };
      }
      return {
        status: mapped.code === 'cancelled' ? 'cancelled' : 'persistence_failure',
        proposalId: proposal.proposalId,
        mutationCount: 0,
      };
    }
  }
}
