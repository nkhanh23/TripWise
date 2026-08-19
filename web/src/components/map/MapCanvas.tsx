import React, { useEffect, useRef, useState } from "react";
import { type MapAdapter, MapLibreAdapter, DEFAULT_PUBLIC_STYLE } from "../../lib/mapAdapter";
import { MapFallback } from "./MapFallback";

interface MapCanvasProps {
  styleUrl?: string;
  center?: [number, number]; // [longitude, latitude]
  zoom?: number;
  className?: string;
  onMapLoad?: (adapter: MapAdapter) => void;
}

// Kiểm tra trình duyệt và phần cứng có hỗ trợ WebGL hay không
function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  styleUrl,
  center = [109.1967, 12.2388], // Mặc định tọa độ Nha Trang
  zoom = 13,
  className = "",
  onMapLoad,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<MapAdapter | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const onMapLoadRef = useRef(onMapLoad);

  useEffect(() => {
    onMapLoadRef.current = onMapLoad;
  });

  const centerLng = center[0];
  const centerLat = center[1];

  useEffect(() => {
    // 1. Kiểm tra hỗ trợ WebGL trước khi khởi tạo
    if (!isWebGLSupported()) {
      setConfigError(
        "WebGLNotSupportedException: Trình duyệt của bạn không hỗ trợ WebGL hoặc tính năng tăng tốc phần cứng bị tắt."
      );
      return;
    }

    let activeStyleUrl = styleUrl || import.meta.env.VITE_MAP_STYLE_URL || DEFAULT_PUBLIC_STYLE;

    // Fail-fast check
    if (!activeStyleUrl) {
      setConfigError(
        "Không tìm thấy cấu hình đường dẫn style bản đồ (VITE_MAP_STYLE_URL). Vui lòng cấu hình biến môi trường trước khi khởi chạy."
      );
      return;
    }

    if (!mapContainerRef.current) return;

    // Khởi tạo thông qua MapLibreAdapter implementation
    const adapter = new MapLibreAdapter();
    adapterRef.current = adapter;

    // Lắng nghe các lỗi runtime như mất WebGL context hay lỗi tải style/tile
    adapter.onError((msg) => {
      console.error("MapAdapter error bubbled to MapCanvas:", msg);
      setConfigError(msg);
    });

    try {
      adapter.initialize(mapContainerRef.current, {
        styleUrl: activeStyleUrl,
        center: [centerLng, centerLat],
        zoom,
      });

      adapter.onLoad(() => {
        // Reset bộ đếm thử lại khi khởi chạy thành công
        retryCountRef.current = 0;
        if (onMapLoadRef.current) {
          onMapLoadRef.current(adapter);
        }
      });
    } catch (err: any) {
      console.error("Map initialization failed inside MapCanvas:", err);
      setConfigError(err?.message || "Lỗi khởi tạo bản đồ.");
    }

    // Cleanup thông qua Adapter
    return () => {
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
    };
  }, [styleUrl, centerLng, centerLat, zoom, retryKey]);

  const handleRetry = () => {
    if (retryCountRef.current >= maxRetries) {
      setConfigError(
        "Đã vượt quá số lần thử lại tối đa (3 lần). Vui lòng tải lại trang hoặc kiểm tra kết nối internet."
      );
      return;
    }

    retryCountRef.current += 1;
    setConfigError(null);
    setRetryKey((prev) => prev + 1);
  };

  // Hiển thị giao diện fallback khi xảy ra lỗi khởi dựng hoặc lỗi WebGL
  if (configError) {
    return (
      <MapFallback
        error={configError}
        onRetry={handleRetry}
        isLoading={retryCountRef.current > 0 && configError === null}
      />
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full min-h-[450px] bg-[#FFFDF3] border-3 border-[#111111] shadow-[4px_4px_0_#111111] rounded-2xl relative ${className}`}
      data-testid="map-canvas"
    />
  );
};
export default MapCanvas;
