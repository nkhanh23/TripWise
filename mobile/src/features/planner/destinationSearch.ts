import { useEffect, useRef, useState } from 'react';
import type { DestinationOption } from './types';
import type { DestinationSearchRepository } from '../../integration/repositories/DestinationSearchRepository';

export function useDestinationSearch(repository: DestinationSearchRepository, initialQuery: string = '') {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<DestinationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<string>('');

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      const t = setTimeout(() => {
        setResults([]);
        setLoading(false);
        setError(null);
      }, 0);
      return () => clearTimeout(t);
    }

    if (trimmed === lastQueryRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const timeout = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      setLoading(true);
      setError(null);
      lastQueryRef.current = trimmed;

      try {
        const mapped = await repository.search(trimmed, controller.signal);
        if (controller.signal.aborted) return;
        setResults(mapped);
      } catch (err: any) {
        if (controller.signal.aborted || err.name === 'AbortError') return;
        setError('Failed to search destinations. Please try again.');
        setResults([]);
        lastQueryRef.current = ''; // allow retry
      } finally {
        if (abortControllerRef.current === controller) {
          setLoading(false);
        }
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [query, repository]);

  return { query, setQuery, results, loading, error };
}

