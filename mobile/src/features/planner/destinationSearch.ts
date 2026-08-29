import { useCallback, useEffect, useRef, useState } from 'react';

import type { DestinationSearchRepository } from '../../integration/repositories/DestinationSearchRepository';
import type { DestinationOption } from './types';

const successfulSearches = new WeakMap<DestinationSearchRepository, Map<string, DestinationOption[]>>();
const maximumCachedQueries = 20;

function cacheFor(repository: DestinationSearchRepository): Map<string, DestinationOption[]> {
  let cache = successfulSearches.get(repository);
  if (!cache) {
    cache = new Map();
    successfulSearches.set(repository, cache);
  }
  return cache;
}

export function useDestinationSearch(repository: DestinationSearchRepository, initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [retryNonce, setRetryNonce] = useState(0);
  const [results, setResults] = useState<DestinationOption[]>(() => cacheFor(repository).get(initialQuery.trim()) ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeSequenceRef = useRef(0);
  const desiredQueryRef = useRef(initialQuery.trim());

  useEffect(() => {
    const trimmed = query.trim();
    if (desiredQueryRef.current !== trimmed) {
      desiredQueryRef.current = trimmed;
      activeSequenceRef.current += 1;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    }

    if (trimmed.length < 2) return;

    if (cacheFor(repository).has(trimmed)) return;

    const sequence = activeSequenceRef.current;
    const timeout = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const mapped = await repository.search(trimmed, controller.signal);
        if (controller.signal.aborted || activeSequenceRef.current !== sequence || desiredQueryRef.current !== trimmed) return;
        const cache = cacheFor(repository);
        if (cache.size >= maximumCachedQueries) {
          const oldestQuery = cache.keys().next().value as string | undefined;
          if (oldestQuery !== undefined) cache.delete(oldestQuery);
        }
        cache.set(trimmed, mapped);
        setResults(mapped);
      } catch (caught: unknown) {
        if (controller.signal.aborted || (caught instanceof Error && caught.name === 'AbortError')) return;
        if (activeSequenceRef.current !== sequence || desiredQueryRef.current !== trimmed) return;
        setError('Failed to search destinations. Please try again.');
        setResults([]);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setLoading(false);
        }
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (abortControllerRef.current && activeSequenceRef.current === sequence) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [query, repository, retryNonce]);

  const updateQuery = useCallback((nextQuery: string) => {
    if (nextQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
    } else {
      const cached = cacheFor(repository).get(nextQuery.trim());
      if (cached) {
        setResults(cached);
        setLoading(false);
        setError(null);
      }
    }
    setQuery(nextQuery);
  }, [repository]);

  const retry = useCallback(() => setRetryNonce((value) => value + 1), []);
  return { query, setQuery: updateQuery, results, loading, error, retry };
}