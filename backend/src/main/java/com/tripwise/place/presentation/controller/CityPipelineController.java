package com.tripwise.place.presentation.controller;

import com.tripwise.common.api.ApiResponse;
import com.tripwise.common.api.PageResponse;
import com.tripwise.place.application.dto.CityPipelineRunRequest;
import com.tripwise.place.application.dto.CityPipelineRunResponse;
import com.tripwise.place.application.service.CityPipelineService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/place-pipelines")
@Validated
@RequiredArgsConstructor
@Tag(name = "Admin City Pipeline", description = "Trigger and monitor City Place Pipeline runs")
public class CityPipelineController {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 50;

    private final CityPipelineService pipelineService;

    @PostMapping("/city-runs")
    @Operation(summary = "Create and run city pipeline", description = "Validate request, create run record, execute pipeline via CLI.")
    public ResponseEntity<ApiResponse<CityPipelineRunResponse>> createRun(
            @RequestBody @Valid CityPipelineRunRequest request
    ) {
        CityPipelineRunResponse result = pipelineService.createAndRun(request);
        return ResponseEntity.ok(ApiResponse.success("Pipeline run created and executed", result));
    }

    @GetMapping("/city-runs/{id}")
    @Operation(summary = "Get pipeline run detail", description = "Return detail for a specific pipeline run.")
    public ResponseEntity<ApiResponse<CityPipelineRunResponse>> getRun(@PathVariable Long id) {
        CityPipelineRunResponse run = pipelineService.getRun(id);
        return ResponseEntity.ok(ApiResponse.success("Pipeline run fetched successfully", run));
    }

    @GetMapping("/city-runs")
    @Operation(summary = "List recent pipeline runs", description = "Return paginated list of recent pipeline runs.")
    public ResponseEntity<ApiResponse<PageResponse<CityPipelineRunResponse>>> listRuns(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size
    ) {
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));

        List<CityPipelineRunResponse> content = pipelineService.listRecentRuns(normalizedSize, normalizedPage * normalizedSize);
        int totalElements = pipelineService.countRuns();
        int totalPages = (int) Math.ceil((double) totalElements / normalizedSize);

        PageResponse<CityPipelineRunResponse> pageResponse = PageResponse.<CityPipelineRunResponse>builder()
                .page(normalizedPage)
                .size(normalizedSize)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .content(content)
                .build();

        return ResponseEntity.ok(ApiResponse.success("Pipeline runs fetched successfully", pageResponse));
    }
}
