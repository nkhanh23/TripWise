import { useCallback } from "react";
import { type MapAdapter, type MarkerModel } from "../lib/mapAdapter";
import { type CameraController } from "./useMapCamera";
import { type RouteLayer } from "../lib/routeLayer";
import { type MarkerLayer } from "../lib/markerLayer";

export interface DayData {
  markers: MarkerModel[];
  routeCoords: [number, number][];
}

/**
 * Custom hook điều phối chuyển đổi dữ liệu bản vẽ bản đồ giữa các ngày du lịch.
 * Đồng bộ hóa thứ tự vẽ: Xóa bản vẽ cũ -> Nạp Marker mới -> Vẽ Route mới -> Zoom Camera.
 */
export const useDayTransition = (
  adapter: MapAdapter | null,
  cameraController: CameraController,
  routeLayer: RouteLayer | null,
  markerLayer: MarkerLayer | null
) => {
  const transitionToDay = useCallback(
    (dayIndex: number, dayData: DayData) => {
      if (!adapter || !routeLayer || !markerLayer) return;

      // 1. Chiến lược Cancellation: Hủy chuyển động camera đang chạy tránh xung đột ma trận viewport
      cameraController.cancelActiveTransitions();

      // 2. Dọn dẹp bản vẽ cũ trên cùng một layer instance (không recreate layer/source)
      markerLayer.clearMarkers();
      routeLayer.clearRoutes();

      // 3. Nạp tập hợp Markers mới cho ngày được chọn
      dayData.markers.forEach((marker) => {
        markerLayer.addMarker(marker);
      });

      // 4. Nạp hình học tuyến đường mới (nếu có đủ từ 2 điểm tọa độ trở lên)
      if (dayData.routeCoords.length >= 2) {
        routeLayer.addRoute({
          id: `day-${dayIndex}-route`,
          coordinates: dayData.routeCoords,
          color: "#20A7D8",
          width: 5,
          opacity: 0.85,
        });
      }

      // 5. Căn chỉnh khung nhìn Camera về vùng địa lý của ngày mới
      if (dayData.markers.length > 0) {
        const lats = dayData.markers.map((m) => m.center[1]);
        const lngs = dayData.markers.map((m) => m.center[0]);

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        if (dayData.markers.length === 1) {
          // Chỉ có 1 địa điểm: FlyTo trực tiếp
          cameraController.flyTo({
            center: dayData.markers[0].center,
            zoom: 14,
            duration: 900,
            essential: true,
          });
        } else {
          // Nhiều địa điểm: FitBounds bao quát toàn bộ danh mục địa điểm trong ngày
          cameraController.fitBounds({
            bounds: [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
            padding: { top: 60, bottom: 60, left: 60, right: 60 },
            duration: 1000,
            essential: true,
          });
        }
      }
    },
    [adapter, cameraController, routeLayer, markerLayer]
  );

  return {
    transitionToDay,
  };
};
export default useDayTransition;
