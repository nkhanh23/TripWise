import { type CandidateDiscoveryRepository, type CandidateDiscoveryRequest, type DiscoveryCandidate, validateCandidateDiscoveryRequest } from './candidateDiscoveryContract';
import { IntegrationError } from './errors';
import { executeWithReliability } from './reliability';

/** One ephemeral review scope. Dispose on unmount/session change; no retained results/cache. */
export class CandidateDiscoverySession {
  private active?: { key: string; controller: AbortController; promise: Promise<DiscoveryCandidate[]> };
  private disposed = false;

  constructor(private readonly repository: CandidateDiscoveryRepository) {}

  discover(request: CandidateDiscoveryRequest): Promise<DiscoveryCandidate[]> {
    if (this.disposed) return Promise.reject(new IntegrationError('cancelled'));
    const body = validateCandidateDiscoveryRequest(request);
    const key = JSON.stringify(body);
    if (this.active?.key === key) return this.active.promise;
    this.cancel();
    const controller = new AbortController();
    const promise = executeWithReliability((signal) => this.repository.discover(body, signal),
      { timeoutMs: 10_000, maximumAttempts: 1 }, controller.signal).then((result) => {
        if (controller.signal.aborted || this.disposed) throw new IntegrationError('cancelled');
        return result;
      }).finally(() => {
        if (this.active?.controller === controller) this.active = undefined;
      });
    this.active = { key, controller, promise };
    return promise;
  }

  cancel(): void {
    this.active?.controller.abort();
    this.active = undefined;
  }

  dispose(): void {
    this.disposed = true;
    this.cancel();
  }
}
