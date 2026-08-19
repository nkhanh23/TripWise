import maplibregl from "maplibre-gl";

export const DEFAULT_PUBLIC_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export interface MapInitOptions {
  styleUrl?: string;
  center?: [number, number];
  zoom?: number;
}

export interface CameraFlyToOptions {
  center: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
  duration?: number;
  essential?: boolean;
}

export interface CameraFitBoundsOptions {
  bounds: [[number, number], [number, number]];
  padding?: number | { top: number; bottom: number; left: number; right: number };
  duration?: number;
  maxZoom?: number;
  essential?: boolean;
}

export interface MarkerModel {
  id: string;
  center: [number, number]; // [lng, lat]
  label: string;
  title: string;
  type: "place" | "accommodation" | "origin";
  selected?: boolean;
  active?: boolean;
}

export interface MapAdapter {
  initialize(container: HTMLDivElement, options: MapInitOptions): void;
  destroy(): void;
  setStyle(styleUrl: string): void;
  onLoad(callback: () => void): void;
  onError(callback: (err: string) => void): void;
  flyTo(options: CameraFlyToOptions): void;
  fitBounds(options: CameraFitBoundsOptions): void;
  easeTo(options: { center?: [number, number]; zoom?: number; duration?: number }): void;
  jumpTo(options: { center?: [number, number]; zoom?: number }): void;
  stop(): void;
  resize(): void;
  disableInteractions(): void;
  enableInteractions(): void;

  // Quản lý GeoJSON Sources
  addGeoJSONSource(id: string, data: any): void;
  updateGeoJSONSource(id: string, data: any): void;
  removeSource(id: string): void;
  hasSource(id: string): boolean;

  // Quản lý Layers
  addPolylineLayer(
    id: string,
    sourceId: string,
    options: { color: string; width: number; opacity?: number }
  ): void;
  removeLayer(id: string): void;
  hasLayer(id: string): boolean;

  // Quản lý Markers
  addMarker(
    marker: MarkerModel,
    options?: {
      onClick?: (id: string) => void;
      onMouseEnter?: (id: string) => void;
      onMouseLeave?: (id: string) => void;
      animateEntry?: boolean;
    }
  ): void;
  updateMarker(id: string, state: { selected?: boolean; active?: boolean }): void;
  removeMarker(id: string): void;
  clearMarkers(): void;
}

export class MapLibreAdapter implements MapAdapter {
  private map: maplibregl.Map | null = null;
  private contextLostHandler: ((event: Event) => void) | null = null;
  private contextRestoredHandler: (() => void) | null = null;
  private markersMap: Map<string, maplibregl.Marker> = new Map();
  private errorCallback: ((err: string) => void) | null = null;
  private currentStyleUrl: string = "";
  private pendingFitBounds: CameraFitBoundsOptions | null = null;
  private resizeObserver: ResizeObserver | null = null;

  initialize(container: HTMLDivElement, options: MapInitOptions): void {
    let styleUrl = options.styleUrl || import.meta.env.VITE_MAP_STYLE_URL || DEFAULT_PUBLIC_STYLE;

    if (!styleUrl) {
      throw new Error(
        "MissingMapStyleConfigurationException: Map style URL configuration is required."
      );
    }

    this.currentStyleUrl = styleUrl;



    // Pipeline rendering optimization
    this.map = new maplibregl.Map({
      container,
      style: styleUrl,
      center: options.center || [109.1967, 12.2388],
      zoom: options.zoom || 13,
      // Cấu hình tối ưu GPU & RAM cho môi trường Production
      pixelRatio: Math.min(window.devicePixelRatio, 2), // Cực kỳ quan trọng: Giới hạn DPI ở 2x giúp giảm tải 50%+ số pixel phải render trên màn hình Retina/High-DPI
      fadeDuration: 100, // Giảm thời gian fade-in của tile giúp map load snappy hơn và bớt hao GPU blend
      collectResourceTiming: false, // Tắt thống kê Network timing để giảm cấp phát bộ nhớ rác
      crossSourceCollisions: false, // Tắt va chạm nhãn giữa các source khác nhau để giảm tải luồng CPU chính
    });

    // Lắng nghe các lỗi nạp tileset hoặc map style
    this.map.on("error", (e: any) => {
      const msg = e?.error?.message || e?.message || "Lỗi nạp bản đồ hoặc tile.";
      console.error("MapLibre runtime error:", msg);
      if (this.errorCallback) {
        this.errorCallback(msg);
      }
    });

    const canvas = this.map.getCanvas();

    // Xử lý mất context WebGL
    this.contextLostHandler = (event: Event) => {
      event.preventDefault();
      console.warn("WebGL context lost handled by MapLibreAdapter.");
      if (this.errorCallback) {
        this.errorCallback("WebGLContextLostException: WebGL context lost. Vui lòng reload trang.");
      }
    };

    // Phục hồi context WebGL
    this.contextRestoredHandler = () => {
      console.info("WebGL context restored handled by MapLibreAdapter. Re-setting style...");
      if (this.map) {
        this.map.setStyle(styleUrl);
      }
    };

    canvas.addEventListener("webglcontextlost", this.contextLostHandler, false);
    canvas.addEventListener("webglcontextrestored", this.contextRestoredHandler, false);

    // Setup ResizeObserver to watch layout changes and resolve zero-dimension fitBounds races
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          if (this.map) {
            this.map.resize();
            if (this.pendingFitBounds) {
              const options = this.pendingFitBounds;
              this.pendingFitBounds = null;
              this.fitBounds(options);
            }
          }
        }
      }
    });
    this.resizeObserver.observe(container);

    this.map.on("render", () => {
      if (this.pendingFitBounds && this.map) {
        const bounds = this.map.getBounds();
        const isProjectionReady = bounds && 
                                  !isNaN(bounds.getWest()) && 
                                  !isNaN(bounds.getSouth()) && 
                                  bounds.getWest() !== bounds.getEast();
        const transform = (this.map as any).transform;
        const isTransformReady = transform && transform.width > 0 && transform.height > 0;

        if (isProjectionReady && isTransformReady) {
          const options = this.pendingFitBounds;
          this.pendingFitBounds = null;
          this.fitBounds(options);
        }
      }
    });
  }

  destroy(): void {
    this.clearMarkers();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.pendingFitBounds = null;

    if (this.map) {
      const canvas = this.map.getCanvas();
      if (canvas) {
        if (this.contextLostHandler) {
          canvas.removeEventListener("webglcontextlost", this.contextLostHandler);
        }
        if (this.contextRestoredHandler) {
          canvas.removeEventListener("webglcontextrestored", this.contextRestoredHandler);
        }
      }
      this.map.remove();
      this.map = null;
    }
    this.contextLostHandler = null;
    this.contextRestoredHandler = null;
    this.errorCallback = null;
    this.currentStyleUrl = "";
  }

  setStyle(styleUrl: string): void {
    if (!styleUrl) {
      throw new Error("MissingMapStyleConfigurationException: Style URL is required.");
    }
    // Optimization: Tránh nạp lại style, vẽ lại layer nếu đường dẫn không thay đổi
    if (this.currentStyleUrl === styleUrl) return;

    if (this.map) {
      this.map.setStyle(styleUrl);
      this.currentStyleUrl = styleUrl;
    }
  }

  onLoad(callback: () => void): void {
    if (this.map) {
      this.map.on("load", callback);
    }
  }

  onError(callback: (err: string) => void): void {
    this.errorCallback = callback;
  }

  flyTo(options: CameraFlyToOptions): void {
    if (this.map) {
      this.map.flyTo({
        center: options.center,
        zoom: options.zoom,
        pitch: options.pitch,
        bearing: options.bearing,
        duration: options.duration,
        essential: options.essential,
      });
    }
  }

  fitBounds(options: CameraFitBoundsOptions): void {
    if (this.map) {
      const container = this.map.getContainer();
      const bounds = this.map.getBounds();
      const isProjectionReady = bounds && 
                                !isNaN(bounds.getWest()) && 
                                !isNaN(bounds.getSouth()) && 
                                bounds.getWest() !== bounds.getEast();
      const transform = (this.map as any).transform;
      const isTransformReady = transform && transform.width > 0 && transform.height > 0;

      if (!container || container.clientWidth === 0 || container.clientHeight === 0 || !isProjectionReady || !isTransformReady) {
        console.info("MapLibreAdapter: Container or projection is not ready yet, queueing fitBounds.");
        this.pendingFitBounds = options;
        return;
      }

      try {
        this.map.resize();
        this.map.fitBounds(options.bounds, {
          padding: options.padding,
          duration: options.duration,
          maxZoom: options.maxZoom,
          essential: options.essential,
        });
      } catch (err) {
        console.warn("MapLibre fitBounds failed with details:", {
          bounds: options.bounds,
          center: this.map.getCenter(),
          zoom: this.map.getZoom(),
          containerSize: {
            width: container.clientWidth,
            height: container.clientHeight
          },
          transformSize: {
            width: (this.map as any).transform?.width,
            height: (this.map as any).transform?.height
          },
          err
        });
      }
    }
  }

  easeTo(options: { center?: [number, number]; zoom?: number; duration?: number }): void {
    if (this.map) {
      this.map.easeTo({
        center: options.center,
        zoom: options.zoom,
        duration: options.duration,
      });
    }
  }

  jumpTo(options: { center?: [number, number]; zoom?: number }): void {
    if (this.map) {
      this.map.jumpTo({
        center: options.center,
        zoom: options.zoom,
      });
    }
  }

  stop(): void {
    if (this.map) {
      this.map.stop();
    }
  }

  resize(): void {
    if (this.map) {
      this.map.resize();
    }
  }

  disableInteractions(): void {
    if (this.map) {
      this.map.dragPan.disable();
      this.map.scrollZoom.disable();
      this.map.doubleClickZoom.disable();
      this.map.boxZoom.disable();
      this.map.dragRotate.disable();
      this.map.keyboard.disable();
      this.map.touchZoomRotate.disable();
    }
  }

  enableInteractions(): void {
    if (this.map) {
      this.map.dragPan.enable();
      this.map.scrollZoom.enable();
      this.map.doubleClickZoom.enable();
      this.map.boxZoom.enable();
      this.map.dragRotate.enable();
      this.map.keyboard.enable();
      this.map.touchZoomRotate.enable();
    }
  }

  // Implementation cho Source Management
  addGeoJSONSource(id: string, data: any): void {
    if (this.map) {
      if (this.map.getSource(id)) {
        console.warn(`Source with ID "${id}" already exists. Skipping add.`);
        return;
      }
      this.map.addSource(id, {
        type: "geojson",
        data: data,
      });
    }
  }

  updateGeoJSONSource(id: string, data: any): void {
    if (this.map) {
      const source = this.map.getSource(id) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(data);
      } else {
        this.addGeoJSONSource(id, data);
      }
    }
  }

  removeSource(id: string): void {
    if (this.map && this.map.getSource(id)) {
      this.map.removeSource(id);
    }
  }

  hasSource(id: string): boolean {
    return this.map ? !!this.map.getSource(id) : false;
  }

  // Implementation cho Layer Management
  addPolylineLayer(
    id: string,
    sourceId: string,
    options: { color: string; width: number; opacity?: number }
  ): void {
    if (this.map) {
      if (this.map.getLayer(id)) {
        console.warn(`Layer with ID "${id}" already exists. Skipping add.`);
        return;
      }
      this.map.addLayer({
        id: id,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": options.color,
          "line-width": options.width,
          "line-opacity": options.opacity ?? 1.0,
        },
      });
    }
  }

  removeLayer(id: string): void {
    if (this.map && this.map.getLayer(id)) {
      this.map.removeLayer(id);
    }
  }

  hasLayer(id: string): boolean {
    return this.map ? !!this.map.getLayer(id) : false;
  }

  // Implementation cho Marker Management
  addMarker(
    marker: MarkerModel,
    options?: {
      onClick?: (id: string) => void;
      onMouseEnter?: (id: string) => void;
      onMouseLeave?: (id: string) => void;
      animateEntry?: boolean;
    }
  ): void {
    if (!this.map) return;

    if (this.markersMap.has(marker.id)) {
      this.updateMarker(marker.id, { selected: marker.selected, active: marker.active });
      return;
    }

    const el = document.createElement("div");
    el.className = `custom-map-marker marker-type-${marker.type}`;
    el.setAttribute("data-id", marker.id);
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", `${marker.title} (${marker.label})`);

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (options?.animateEntry && !prefersReduced) {
      el.style.transform = "scale(0)";
      el.style.opacity = "0";
    }

    const pin = document.createElement("div");
    pin.className =
      "marker-pin border-2 border-[#111111] shadow-[2px_2px_0_#111111] rounded-full w-8 h-8 flex items-center justify-center font-bold text-xs cursor-pointer select-none transition-transform duration-150";

    let bgColor = "#FFFDF3";
    let textColor = "#111111";
    if (marker.type === "accommodation") {
      bgColor = "#E6392E";
      textColor = "#FFF6DE";
    } else if (marker.type === "origin") {
      bgColor = "#20A7D8";
      textColor = "#FFF6DE";
    } else if (marker.selected) {
      bgColor = "#FFBE1A";
    }

    pin.style.backgroundColor = bgColor;
    pin.style.color = textColor;
    pin.innerText = marker.label;
    el.appendChild(pin);

    if (options?.onClick) {
      el.addEventListener("click", () => options.onClick!(marker.id));
      el.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          options.onClick!(marker.id);
        }
      });
    }
    if (options?.onMouseEnter) {
      el.addEventListener("mouseenter", () => options.onMouseEnter!(marker.id));
      el.addEventListener("focus", () => options.onMouseEnter!(marker.id));
    }
    if (options?.onMouseLeave) {
      el.addEventListener("mouseleave", () => options.onMouseLeave!(marker.id));
      el.addEventListener("blur", () => options.onMouseLeave!(marker.id));
    }

    const maplibreMarker = new maplibregl.Marker({ element: el })
      .setLngLat(marker.center)
      .addTo(this.map);

    this.markersMap.set(marker.id, maplibreMarker);
  }

  updateMarker(id: string, state: { selected?: boolean; active?: boolean }): void {
    const maplibreMarker = this.markersMap.get(id);
    if (!maplibreMarker) return;

    const el = maplibreMarker.getElement();
    const pin = el.querySelector(".marker-pin") as HTMLDivElement;
    if (pin) {
      if (state.selected) {
        pin.style.transform = "scale(1.2) translateY(-2px)";
        pin.style.backgroundColor = "#FFBE1A";
      } else {
        pin.style.transform = "none";
        if (el.classList.contains("marker-type-accommodation")) {
          pin.style.backgroundColor = "#E6392E";
        } else if (el.classList.contains("marker-type-origin")) {
          pin.style.backgroundColor = "#20A7D8";
        } else {
          pin.style.backgroundColor = "#FFFDF3";
        }
      }
    }
  }

  removeMarker(id: string): void {
    const maplibreMarker = this.markersMap.get(id);
    if (maplibreMarker) {
      maplibreMarker.remove();
      this.markersMap.delete(id);
    }
  }

  clearMarkers(): void {
    this.markersMap.forEach((marker) => {
      marker.remove();
    });
    this.markersMap.clear();
  }
}
