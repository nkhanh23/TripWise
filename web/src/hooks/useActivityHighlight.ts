import { useCallback, useRef } from "react";
import { type MapAdapter } from "../lib/mapAdapter";
import { type CameraController } from "./useMapCamera";
import { type RouteLayer } from "../lib/routeLayer";
import { type MarkerLayer } from "../lib/markerLayer";

/**
 * Custom hook điều phối việc đồng bộ trạng thái Highlight giữa hoạt động được chọn (Timeline)
 * với các thực thể trên bản đồ (Marker và Route segment).
 */
export const useActivityHighlight = (
  adapter: MapAdapter | null,
  cameraController: CameraController,
  routeLayer: RouteLayer | null,
  markerLayer: MarkerLayer | null
) => {
  const activeActivityIdRef = useRef<string | null>(null);

  // Highlight một địa điểm/marker cụ thể
  const highlightActivity = useCallback(
    (activityId: string, center: [number, number]) => {
      if (!adapter || !markerLayer) return;

      // 1. Reset marker cũ đã highlight trước đó
      if (activeActivityIdRef.current && activeActivityIdRef.current !== activityId) {
        markerLayer.updateMarker(activeActivityIdRef.current, {
          active: false,
          selected: false,
        });
      }

      activeActivityIdRef.current = activityId;

      // 2. Cập nhật state hiển thị của Marker mới (không recreate marker)
      markerLayer.updateMarker(activityId, { active: true, selected: true });

      // 3. Zoom Camera dịch chuyển nhẹ về tiêu điểm của Marker được highlight
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      cameraController.flyTo({
        center,
        zoom: 15,
        duration: prefersReduced ? 0 : 550,
        essential: true,
      });
    },
    [adapter, markerLayer, cameraController]
  );

  // Highlight một chặng di chuyển (Route segment) giữa hai điểm
  const highlightRouteSegment = useCallback(
    (coordinates: [number, number][]) => {
      if (!adapter || !routeLayer) return;
      routeLayer.highlightSegment(coordinates);
    },
    [adapter, routeLayer]
  );

  // Dọn dẹp toàn bộ highlight
  const clearHighlight = useCallback(() => {
    if (!adapter) return;

    if (activeActivityIdRef.current && markerLayer) {
      markerLayer.updateMarker(activeActivityIdRef.current, {
        active: false,
        selected: false,
      });
      activeActivityIdRef.current = null;
    }

    if (routeLayer) {
      routeLayer.clearHighlightSegment();
    }
  }, [adapter, markerLayer, routeLayer]);

  return {
    highlightActivity,
    highlightRouteSegment,
    clearHighlight,
  };
};
export default useActivityHighlight;
