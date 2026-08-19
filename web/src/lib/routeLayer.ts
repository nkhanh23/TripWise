import { type MapAdapter } from "./mapAdapter";
import { lineString } from "@turf/helpers";
import gsap from "gsap";

export interface RouteData {
  id: string;
  coordinates: [number, number][]; // [[lng, lat], ...]
  color?: string;
  width?: number;
  opacity?: number;
}

export class RouteLayer {
  private adapter: MapAdapter;
  private activeRouteIds: Set<string> = new Set();

  constructor(adapter: MapAdapter) {
    this.adapter = adapter;
  }

  addRoute(route: RouteData): void {
    if (route.coordinates.length < 2) {
      console.warn(`Route ${route.id} has less than 2 coordinates. Cannot render.`);
      return;
    }

    const sourceId = `route-source-${route.id}`;
    const layerId = `route-layer-${route.id}`;

    // Tạo GeoJSON LineString bằng @turf/helpers
    const geojson = lineString(route.coordinates);

    // Thêm source và layer thông qua Adapter
    this.adapter.addGeoJSONSource(sourceId, geojson);
    this.adapter.addPolylineLayer(layerId, sourceId, {
      color: route.color || "#20A7D8",
      width: route.width || 5,
      opacity: route.opacity || 1.0,
    });

    this.activeRouteIds.add(route.id);
  }

  addAnimatedRoute(route: RouteData, tl: gsap.core.Timeline, duration: number = 1.5, position?: string | number): void {
    if (route.coordinates.length < 2) {
      console.warn(`Route ${route.id} has less than 2 coordinates. Cannot animate.`);
      return;
    }

    const initialCoords = [route.coordinates[0], route.coordinates[0]] as [number, number][];
    this.addRoute({
      ...route,
      coordinates: initialCoords,
    });

    const obj = { progress: 0 };
    tl.to(
      obj,
      {
        progress: 1,
        duration: duration,
        ease: "power2.out",
        onUpdate: () => {
          const coords = route.coordinates;
          const N = coords.length;
          if (N < 2) return;
          const S = N - 1;
          const idxFloat = obj.progress * S;
          const idx = Math.floor(idxFloat);
          const t = idxFloat - idx;

          const animatedCoords = coords.slice(0, idx + 1);
          if (idx < S) {
            const nextPt = coords[idx + 1];
            const currPt = coords[idx];
            const interpolatedPt: [number, number] = [
              currPt[0] + (nextPt[0] - currPt[0]) * t,
              currPt[1] + (nextPt[1] - currPt[1]) * t,
            ];
            animatedCoords.push(interpolatedPt);
          }

          this.updateRoute({
            ...route,
            coordinates: animatedCoords,
          });
        },
      },
      position
    );
  }

  updateRoute(route: RouteData): void {
    if (route.coordinates.length < 2) {
      this.removeRoute(route.id);
      return;
    }

    const sourceId = `route-source-${route.id}`;

    if (!this.activeRouteIds.has(route.id)) {
      this.addRoute(route);
      return;
    }

    const geojson = lineString(route.coordinates);
    this.adapter.updateGeoJSONSource(sourceId, geojson);
  }

  removeRoute(id: string): void {
    if (!this.activeRouteIds.has(id)) return;

    const sourceId = `route-source-${id}`;
    const layerId = `route-layer-${id}`;

    this.adapter.removeLayer(layerId);
    this.adapter.removeSource(sourceId);

    this.activeRouteIds.delete(id);
  }

  clearRoutes(): void {
    const ids = Array.from(this.activeRouteIds);
    ids.forEach((id) => this.removeRoute(id));
    this.activeRouteIds.clear();
    this.clearHighlightSegment();
  }

  getActiveRouteIds(): string[] {
    return Array.from(this.activeRouteIds);
  }

  // Highlight một phân đoạn cụ thể (ví dụ: chặng đi giữa 2 địa điểm được chọn)
  highlightSegment(coordinates: [number, number][], color: string = "#E6392E", width: number = 7): void {
    if (coordinates.length < 2) return;

    const sourceId = "route-highlight-source";
    const layerId = "route-highlight-layer";
    const geojson = lineString(coordinates);

    if (this.adapter.hasSource(sourceId)) {
      this.adapter.updateGeoJSONSource(sourceId, geojson);
    } else {
      this.adapter.addGeoJSONSource(sourceId, geojson);
      this.adapter.addPolylineLayer(layerId, sourceId, {
        color,
        width,
        opacity: 1.0,
      });
    }
  }

  // Dọn dẹp highlight phân đoạn
  clearHighlightSegment(): void {
    const sourceId = "route-highlight-source";
    const layerId = "route-highlight-layer";

    if (this.adapter.hasLayer(layerId)) {
      this.adapter.removeLayer(layerId);
    }
    if (this.adapter.hasSource(sourceId)) {
      this.adapter.removeSource(sourceId);
    }
  }
}
