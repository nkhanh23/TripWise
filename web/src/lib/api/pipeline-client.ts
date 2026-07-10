import { httpClient } from "./http-client";
import type { CityPipelineRunRequest, CityPipelineRunResponse, PageResponse } from "./contracts";

export function createPipelineRun(request: CityPipelineRunRequest): Promise<CityPipelineRunResponse> {
  return httpClient.post<CityPipelineRunResponse>("/admin/place-pipelines/city-runs", request, {
    requiresAuth: true
  });
}

export function getPipelineRun(id: number): Promise<CityPipelineRunResponse> {
  return httpClient.get<CityPipelineRunResponse>(`/admin/place-pipelines/city-runs/${id}`, {
    requiresAuth: true
  });
}

export function listPipelineRuns(page = 0, size = 10): Promise<PageResponse<CityPipelineRunResponse>> {
  return httpClient.get<PageResponse<CityPipelineRunResponse>>(
    `/admin/place-pipelines/city-runs?page=${page}&size=${size}`,
    { requiresAuth: true }
  );
}
