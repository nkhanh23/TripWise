import { useCallback, useEffect, useRef, useState } from 'react';

import { IntegrationError, mapUnknownTransportError } from '../../integration/errors';
import type { PlaceResolutionRepository } from '../../integration/repositories';
import { asItineraryItemId } from '../../integration/validation';

export type PlaceResolutionStatus = 'UNRESOLVED_IDLE' | 'RESOLVING' | 'VERIFIED' | 'ERROR';

export function usePlaceResolution(repository?: PlaceResolutionRepository, onRefresh?: () => Promise<boolean>) {
  const [statuses, setStatuses] = useState<Record<string, PlaceResolutionStatus>>({});
  const [errors, setErrors] = useState<Record<string, IntegrationError>>({});
  const controllers = useRef(new Map<string, AbortController>());

  useEffect(() => () => {
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
  }, []);

  const resolve = useCallback(async (itemId: string) => {
    if (!repository || controllers.current.has(itemId)) return false;
    let typedId;
    try { typedId = asItineraryItemId(itemId); } catch { return false; }
    const controller = new AbortController();
    controllers.current.set(itemId, controller);
    setStatuses((current) => ({ ...current, [itemId]: 'RESOLVING' }));
    setErrors((current) => { const next = { ...current }; delete next[itemId]; return next; });
    try {
      const result = await repository.resolve({ itineraryItemId: typedId }, controller.signal);
      const refreshed = await onRefresh?.();
      const verified = result.resolution.startsWith('VERIFIED') && refreshed !== false;
      setStatuses((current) => ({ ...current, [itemId]: verified ? 'VERIFIED' : 'ERROR' }));
      return verified;
    } catch (error) {
      const mapped = mapUnknownTransportError(error);
      if (mapped.code !== 'cancelled') {
        setStatuses((current) => ({ ...current, [itemId]: 'ERROR' }));
        setErrors((current) => ({ ...current, [itemId]: mapped }));
      }
      return false;
    } finally {
      controllers.current.delete(itemId);
    }
  }, [onRefresh, repository]);

  const retry = useCallback((itemId: string) => resolve(itemId), [resolve]);
  return { statuses, errors, resolve, retry };
}
