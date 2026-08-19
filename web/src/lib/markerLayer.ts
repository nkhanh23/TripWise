import { type MapAdapter, type MarkerModel } from "./mapAdapter";

export class MarkerLayer {
  private adapter: MapAdapter;
  private activeMarkers: Map<string, MarkerModel> = new Map();

  constructor(adapter: MapAdapter) {
    this.adapter = adapter;
  }

  addMarker(
    marker: MarkerModel,
    options?: {
      onClick?: (id: string) => void;
      onMouseEnter?: (id: string) => void;
      onMouseLeave?: (id: string) => void;
      animateEntry?: boolean;
    }
  ): void {
    this.adapter.addMarker(marker, options);
    this.activeMarkers.set(marker.id, marker);
  }

  updateMarker(id: string, state: { selected?: boolean; active?: boolean }): void {
    const existing = this.activeMarkers.get(id);
    if (!existing) return;

    const updated = { ...existing, ...state };
    this.activeMarkers.set(id, updated);

    this.adapter.updateMarker(id, state);
  }

  removeMarker(id: string): void {
    if (!this.activeMarkers.has(id)) return;
    this.adapter.removeMarker(id);
    this.activeMarkers.delete(id);
  }

  clearMarkers(): void {
    this.adapter.clearMarkers();
    this.activeMarkers.clear();
  }

  getActiveMarkers(): MarkerModel[] {
    return Array.from(this.activeMarkers.values());
  }

  getMarker(id: string): MarkerModel | undefined {
    return this.activeMarkers.get(id);
  }
}
