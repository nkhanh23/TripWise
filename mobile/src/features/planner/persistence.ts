import { useCallback, useEffect, useRef, useState } from "react";

import {
  IntegrationError,
  mapUnknownTransportError,
} from "../../integration/errors";
import {
  IdempotencyKeyFactory,
  SaveIntent,
} from "../../integration/idempotency";
import { SupabaseTripPersistenceRepository } from "../../integration/remote/supabaseTripRepositories";
import type { TripPersistenceRepository } from "../../integration/repositories";
import {
  mapPlannerPreviewToPersistenceGraph,
  type PlannerGeneratedPreview,
} from "./generationContracts";

export type TripPersistenceState =
  | { status: "idle"; tripId: null; error: null }
  | { status: "saving"; tripId: null; error: null }
  | { status: "success"; tripId: string; error: null }
  | { status: "error"; tripId: null; error: IntegrationError };

export function useTripPersistence(repository?: TripPersistenceRepository) {
  const [state, setState] = useState<TripPersistenceState>({
    status: "idle",
    tripId: null,
    error: null,
  });
  const repositoryRef = useRef(repository);
  const intentRef = useRef<SaveIntent | null>(null);
  const mountedRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);
  const previewRef = useRef<{
    preview: PlannerGeneratedPreview;
    title?: string | null;
  } | null>(null);

  useEffect(
    () => () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    },
    [],
  );

  const save = useCallback(
    async (preview: PlannerGeneratedPreview, title?: string | null) => {
      if (controllerRef.current) return null;
      const controller = new AbortController();
      controllerRef.current = controller;
      previewRef.current = { preview, title };
      const intent =
        intentRef.current ?? new IdempotencyKeyFactory().createSaveIntent();
      intentRef.current = intent;
      setState({ status: "saving", tripId: null, error: null });
      try {
        const activeRepository =
          repositoryRef.current ??
          new SupabaseTripPersistenceRepository(
            (await import("../../lib/supabase/client")).supabase,
          );
        const tripId = await activeRepository.persist(
          {
            idempotencyKey: intent.key(),
            graph: mapPlannerPreviewToPersistenceGraph(preview, title),
          },
          controller.signal,
        );
        intent.complete();
        intentRef.current = null;
        previewRef.current = null;
        if (mountedRef.current)
          setState({ status: "success", tripId, error: null });
        return tripId;
      } catch (error) {
        const mapped = mapUnknownTransportError(error);
        if (mountedRef.current && mapped.code !== "cancelled") {
          setState({ status: "error", tripId: null, error: mapped });
        }
        return null;
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [],
  );

  const retry = useCallback(async () => {
    if (!previewRef.current) return null;
    return save(previewRef.current.preview, previewRef.current.title);
  }, [save]);

  const cancel = useCallback(() => controllerRef.current?.abort(), []);
  return { state, save, retry, cancel };
}
