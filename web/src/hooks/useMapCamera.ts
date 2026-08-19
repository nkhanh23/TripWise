import { useEffect, useRef, useCallback, useMemo } from "react";
import {
  type MapAdapter,
  type CameraFlyToOptions,
  type CameraFitBoundsOptions,
} from "../lib/mapAdapter";

export interface CameraController {
  flyTo(options: CameraFlyToOptions): void;
  fitBounds(options: CameraFitBoundsOptions): void;
  easeTo(options: { center?: [number, number]; zoom?: number; duration?: number }): void;
  jumpTo(options: { center?: [number, number]; zoom?: number }): void;
  cancelActiveTransitions(): void;
}

export const useMapCamera = (adapter: MapAdapter | null): CameraController => {
  const activeTransitionsRef = useRef<boolean>(false);

  const flyTo = useCallback(
    (options: CameraFlyToOptions) => {
      if (!adapter) return;
      activeTransitionsRef.current = true;
      adapter.flyTo(options);
    },
    [adapter]
  );

  const fitBounds = useCallback(
    (options: CameraFitBoundsOptions) => {
      if (!adapter) return;
      activeTransitionsRef.current = true;
      adapter.fitBounds(options);
    },
    [adapter]
  );

  const easeTo = useCallback(
    (options: { center?: [number, number]; zoom?: number; duration?: number }) => {
      if (!adapter) return;
      activeTransitionsRef.current = true;
      adapter.easeTo(options);
    },
    [adapter]
  );

  const jumpTo = useCallback(
    (options: { center?: [number, number]; zoom?: number }) => {
      if (!adapter) return;
      activeTransitionsRef.current = true;
      adapter.jumpTo(options);
    },
    [adapter]
  );

  const cancelActiveTransitions = useCallback(() => {
    if (!adapter) return;
    if (activeTransitionsRef.current) {
      adapter.stop();
      activeTransitionsRef.current = false;
      console.info("CameraController: Active camera transition canceled.");
    }
  }, [adapter]);

  // Hủy bỏ các hiệu ứng đang chạy nếu adapter thay đổi hoặc unmount
  useEffect(() => {
    return () => {
      if (adapter && activeTransitionsRef.current) {
        adapter.stop();
      }
    };
  }, [adapter]);

  return useMemo(
    () => ({
      flyTo,
      fitBounds,
      easeTo,
      jumpTo,
      cancelActiveTransitions,
    }),
    [flyTo, fitBounds, easeTo, jumpTo, cancelActiveTransitions]
  );
};
