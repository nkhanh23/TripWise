import { httpClient } from "./http-client";
import { type PageResponse, type PlaceResponse } from "./contracts";

export interface SearchPlacesParams {
  city?: string;
  categoryId?: number;
  tags?: string[];
  priceLevel?: string;
  keyword?: string;
  page?: number;
  size?: number;
}

export async function searchPlaces(
  params: SearchPlacesParams = {}
): Promise<PageResponse<PlaceResponse>> {
  const searchParams = new URLSearchParams();

  if (params.city) searchParams.append("city", params.city);
  if (params.categoryId !== undefined)
    searchParams.append("categoryId", params.categoryId.toString());
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach((tag) => searchParams.append("tags", tag));
  }
  if (params.priceLevel) searchParams.append("priceLevel", params.priceLevel);
  if (params.keyword) searchParams.append("keyword", params.keyword);
  if (params.page !== undefined)
    searchParams.append("page", params.page.toString());
  if (params.size !== undefined)
    searchParams.append("size", params.size.toString());

  const queryString = searchParams.toString();
  const url = queryString ? `/places?${queryString}` : "/places";

  return httpClient.get<PageResponse<PlaceResponse>>(url);
}

export async function getPlaceDetail(id: number): Promise<PlaceResponse> {
  return httpClient.get<PlaceResponse>(`/places/${id}`);
}
