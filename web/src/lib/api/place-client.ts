import { httpClient } from "./http-client";
import {
  type AdminPlaceReviewResponse,
  type PageResponse,
  type PlaceMapMarkerResponse,
  type PlaceResponse
} from "./contracts";

export interface SearchPlacesParams {
  province?: string;
  city?: string;
  placeType?: string;
  categoryId?: number;
  tags?: string[];
  priceLevel?: string;
  verificationStatus?: string;
  minRating?: number;
  keyword?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  size?: number;
}

export interface MapMarkersParams {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  province?: string;
  city?: string;
  placeType?: string;
  categoryId?: number;
  tags?: string[];
  verificationStatus?: string;
  minRating?: number;
  limit?: number;
}

export interface AdminPlaceReviewParams {
  source?: string;
  province?: string;
  city?: string;
  placeType?: string;
  verificationStatus?: string;
  recommendable?: boolean;
  keyword?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  size?: number;
}

export async function searchPlaces(
  params: SearchPlacesParams = {}
): Promise<PageResponse<PlaceResponse>> {
  const searchParams = new URLSearchParams();

  if (params.province) searchParams.append("province", params.province);
  if (params.city) searchParams.append("city", params.city);
  if (params.placeType) searchParams.append("placeType", params.placeType);
  if (params.categoryId !== undefined)
    searchParams.append("categoryId", params.categoryId.toString());
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach((tag) => searchParams.append("tags", tag));
  }
  if (params.priceLevel) searchParams.append("priceLevel", params.priceLevel);
  if (params.verificationStatus) searchParams.append("verificationStatus", params.verificationStatus);
  if (params.minRating !== undefined)
    searchParams.append("minRating", params.minRating.toString());
  if (params.keyword) searchParams.append("keyword", params.keyword);
  if (params.sortBy) searchParams.append("sortBy", params.sortBy);
  if (params.sortDirection) searchParams.append("sortDirection", params.sortDirection);
  if (params.page !== undefined)
    searchParams.append("page", params.page.toString());
  if (params.size !== undefined)
    searchParams.append("size", params.size.toString());

  const queryString = searchParams.toString();
  const url = queryString ? `/places?${queryString}` : "/places";

  return httpClient.get<PageResponse<PlaceResponse>>(url);
}

export async function getPlaceMapMarkers(
  params: MapMarkersParams
): Promise<PlaceMapMarkerResponse[]> {
  const searchParams = new URLSearchParams();

  searchParams.append("minLat", params.minLat.toString());
  searchParams.append("minLng", params.minLng.toString());
  searchParams.append("maxLat", params.maxLat.toString());
  searchParams.append("maxLng", params.maxLng.toString());
  if (params.province) searchParams.append("province", params.province);
  if (params.city) searchParams.append("city", params.city);
  if (params.placeType) searchParams.append("placeType", params.placeType);
  if (params.categoryId !== undefined)
    searchParams.append("categoryId", params.categoryId.toString());
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach((tag) => searchParams.append("tags", tag));
  }
  if (params.verificationStatus) searchParams.append("verificationStatus", params.verificationStatus);
  if (params.minRating !== undefined)
    searchParams.append("minRating", params.minRating.toString());
  if (params.limit !== undefined)
    searchParams.append("limit", params.limit.toString());

  return httpClient.get<PlaceMapMarkerResponse[]>(`/places/map-markers?${searchParams.toString()}`);
}

export async function getPlaceDetail(id: number): Promise<PlaceResponse> {
  return httpClient.get<PlaceResponse>(`/places/${id}`);
}

export async function searchAdminPlacesForReview(
  params: AdminPlaceReviewParams = {}
): Promise<PageResponse<AdminPlaceReviewResponse>> {
  const searchParams = new URLSearchParams();

  if (params.source) searchParams.append("source", params.source);
  if (params.province) searchParams.append("province", params.province);
  if (params.city) searchParams.append("city", params.city);
  if (params.placeType) searchParams.append("placeType", params.placeType);
  if (params.verificationStatus) searchParams.append("verificationStatus", params.verificationStatus);
  if (params.recommendable !== undefined) {
    searchParams.append("recommendable", String(params.recommendable));
  }
  if (params.keyword) searchParams.append("keyword", params.keyword);
  if (params.sortBy) searchParams.append("sortBy", params.sortBy);
  if (params.sortDirection) searchParams.append("sortDirection", params.sortDirection);
  if (params.page !== undefined) searchParams.append("page", params.page.toString());
  if (params.size !== undefined) searchParams.append("size", params.size.toString());

  const queryString = searchParams.toString();
  const url = queryString ? `/admin/places/review?${queryString}` : "/admin/places/review";

  return httpClient.get<PageResponse<AdminPlaceReviewResponse>>(url, {
    requiresAuth: true
  });
}
