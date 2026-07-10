package com.tripwise.place.application.service;

import com.tripwise.common.exception.BusinessException;
import com.tripwise.place.application.dto.CityPipelineRunRequest;
import com.tripwise.place.application.dto.CityPipelineRunResponse;
import com.tripwise.place.infrastructure.persistence.AdminCityPipelineJdbcRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;


import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class CityPipelineService {

    private static final long PROCESS_TIMEOUT_SECONDS = 300;
    private static final int MAX_OUTPUT_LINES = 500;
    private static final int MAX_OUTPUT_CHARS = 100_000;

    private final AdminCityPipelineJdbcRepository repository;

    @Value("${spring.datasource.url:}")
    private String dbUrl;

    @Value("${spring.datasource.username:}")
    private String dbUsername;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    @Value("${tripwise.pipeline.script-path:backend/tools/run_city_place_pipeline.py}")
    private String scriptPath;

    public CityPipelineRunResponse createAndRun(CityPipelineRunRequest request) {
        validateNoPublicApply(request);

        CityPipelineRunResponse runRecord = repository.insert(
                request.getSource(),
                request.getProvince(),
                request.getCity(),
                request.getInputPath(),
                request.getImportRunId(),
                request.getReleaseDate(),
                request.getBbox(),
                request.getLimit(),
                request.getStep(),
                request.isDryRun(),
                request.isConfirmWriteStaging()
        );

        return executePipeline(runRecord);
    }

    private void validateNoPublicApply(CityPipelineRunRequest request) {
        String source = request.getSource() != null ? request.getSource().toLowerCase() : "";
        String province = request.getProvince() != null ? request.getProvince().toLowerCase() : "";
        String city = request.getCity() != null ? request.getCity().toLowerCase() : "";
        String inputPath = request.getInputPath() != null ? request.getInputPath().toLowerCase() : "";
        String step = request.getStep() != null ? request.getStep().toLowerCase() : "";

        String combined = source + " " + province + " " + city + " " + inputPath + " " + step;
        if (combined.contains("publish") || combined.contains("applypublic") || combined.contains("writepublic") || combined.contains("bulkpublish")) {
            log.warn("Rejected pipeline run request with illegal public-apply terms: {}", combined);
            throw new BusinessException("Pipeline does not support writing to public tables. Illegal terms detected in request.", "ILLEGAL_PUBLIC_APPLY");
        }
    }

    public CityPipelineRunResponse executePipeline(CityPipelineRunResponse runRecord) {
        Long runId = runRecord.getId();

        try {
            repository.updateStatus(runId, "RUNNING", Instant.now(), null);
            runRecord.setStatus("RUNNING");
            runRecord.setStartedAt(Instant.now());

            List<String> command = buildCommand(runRecord);
            java.io.File cwd = new java.io.File(".").getAbsoluteFile();
            java.io.File scriptFile = new java.io.File(cwd, command.get(1));
            log.info("Executing pipeline run ID={} cwd={}: {}", runId, cwd, String.join(" ", command));
            log.info("Script exists={}, scriptPath={}", scriptFile.exists(), scriptFile.getAbsolutePath());

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.directory(cwd);

            if (!dbUrl.isBlank()) {
                pb.environment().put("SPRING_DATASOURCE_URL", dbUrl);
            }
            if (!dbUsername.isBlank()) {
                pb.environment().put("SPRING_DATASOURCE_USERNAME", dbUsername);
            }
            if (!dbPassword.isBlank()) {
                pb.environment().put("SPRING_DATASOURCE_PASSWORD", dbPassword);
            }

            pb.redirectErrorStream(true);
            Process process = pb.start();

            StringBuilder outputBuilder = new StringBuilder();
            List<String> outputLines = new ArrayList<>();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                int lineCount = 0;
                while ((line = reader.readLine()) != null && lineCount < MAX_OUTPUT_LINES) {
                    outputLines.add(line);
                    if (outputBuilder.length() < MAX_OUTPUT_CHARS) {
                        outputBuilder.append(line).append("\n");
                    }
                    lineCount++;
                }
            }

            boolean finished = process.waitFor(PROCESS_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            int exitCode;
            if (finished) {
                exitCode = process.exitValue();
            } else {
                process.destroyForcibly();
                exitCode = -1;
                String msg = "Pipeline process timed out after " + PROCESS_TIMEOUT_SECONDS + " seconds";
                repository.updateError(runId, msg);
                runRecord.setStatus("FAILED");
                runRecord.setErrorMessage(msg);
                runRecord.setFinishedAt(Instant.now());
                return runRecord;
            }

            String fullOutput = outputBuilder.toString();

            if (exitCode == 0) {
                String summary = parseSummary(fullOutput, outputLines);
                String adminUrl = parseAdminUrl(fullOutput, outputLines);
                Long capturedImportRunId = parsePipelineImportRunId(fullOutput, outputLines);
                repository.updateSummaryAndImportRunId(runId, summary, adminUrl, capturedImportRunId);
                repository.updateStatus(runId, "SUCCEEDED", runRecord.getStartedAt(), Instant.now());
                runRecord.setStatus("SUCCEEDED");
                runRecord.setSummaryText(summary);
                runRecord.setAdminQueueUrl(adminUrl);
                if (capturedImportRunId != null) {
                    runRecord.setImportRunId(capturedImportRunId);
                }
            } else {
                String errorMsg = parseErrorMessage(fullOutput, outputLines, exitCode);
                repository.updateError(runId, errorMsg);
                runRecord.setStatus("FAILED");
                runRecord.setErrorMessage(errorMsg);
            }

            runRecord.setFinishedAt(Instant.now());
            return repository.findById(runId).orElse(runRecord);

        } catch (Exception e) {
            log.error("Pipeline execution failed for run ID={}", runId, e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : "Unknown error";
            runRecord.setStatus("FAILED");
            runRecord.setErrorMessage(errorMsg);
            runRecord.setFinishedAt(Instant.now());
            try {
                repository.updateError(runId, errorMsg);
            } catch (Exception innerEx) {
                log.error("Failed to persist pipeline error for run ID={}", runId, innerEx);
            }
            return runRecord;
        }
    }

    private List<String> buildCommand(CityPipelineRunResponse run) {
        List<String> cmd = new ArrayList<>();
        cmd.add("py");
        cmd.add(scriptPath);
        cmd.add("--source");
        cmd.add(run.getSource());
        cmd.add("--province");
        cmd.add(run.getProvince());
        cmd.add("--city");
        cmd.add(run.getCity());

        if (run.getInputPath() != null && !run.getInputPath().isBlank()) {
            cmd.add("--input");
            cmd.add(run.getInputPath());
        }
        if (run.getImportRunId() != null) {
            cmd.add("--import-run-id");
            cmd.add(String.valueOf(run.getImportRunId()));
        }
        if (run.getReleaseDate() != null && !run.getReleaseDate().isBlank()) {
            cmd.add("--release-date");
            cmd.add(run.getReleaseDate());
        }
        if (run.getBbox() != null && !run.getBbox().isBlank()) {
            cmd.add("--bbox");
            cmd.add(run.getBbox());
        }
        if (run.getLimitCount() != null) {
            cmd.add("--limit");
            cmd.add(String.valueOf(run.getLimitCount()));
        }
        if (run.getStep() != null && !run.getStep().isBlank()) {
            cmd.add("--step");
            cmd.add(run.getStep());
        }

        if (run.isDryRun()) {
            cmd.add("--dry-run");
        }

        if (run.isConfirmWriteStaging()) {
            cmd.add("--confirm-write-staging");
        }

        return cmd;
    }

    private String parseSummary(String fullOutput, List<String> lines) {
        StringBuilder sb = new StringBuilder();

        Pattern countsPattern = Pattern.compile(
                "Public counts before - Places: (\\d+), Hotels: (\\d+)");
        Matcher beforeMatcher = countsPattern.matcher(fullOutput);
        if (beforeMatcher.find()) {
            sb.append("Before - Places: ").append(beforeMatcher.group(1))
                    .append(", Hotels: ").append(beforeMatcher.group(2)).append("\n");
        }

        Pattern afterPattern = Pattern.compile(
                "Public counts after - Places: (\\d+).*Hotels: (\\d+)");
        Matcher afterMatcher = afterPattern.matcher(fullOutput);
        if (afterMatcher.find()) {
            sb.append("After - Places: ").append(afterMatcher.group(1))
                    .append(", Hotels: ").append(afterMatcher.group(2)).append("\n");
        }

        Pattern reportPatterns = Pattern.compile(
                "Simulation Moderation Results:|Moderation status breakdown:|Place Type draft breakdown:|Deduplication status breakdown:|APPROVED_FOR_APPLY:|PENDING_ADMIN_REVIEW:|REJECTED:");
        for (String line : lines) {
            if (reportPatterns.matcher(line).find() || line.contains("Total Staging")) {
                sb.append(line.trim()).append("\n");
            }
        }

        Pattern samplePattern = Pattern.compile("Sample (APPROVED_FOR_APPLY|PENDING_ADMIN_REVIEW|REJECTED).*");
        boolean inSample = false;
        int sampleCount = 0;
        for (String line : lines) {
            if (samplePattern.matcher(line).find()) {
                inSample = true;
                sb.append(line.trim()).append("\n");
                sampleCount = 0;
                continue;
            }
            if (inSample) {
                if (line.trim().startsWith("Sample ") || line.trim().startsWith("Suggested") || line.trim().isEmpty()) {
                    inSample = false;
                } else if (line.trim().startsWith("- ID:") && sampleCount < 5) {
                    sb.append("  ").append(line.trim()).append("\n");
                    sampleCount++;
                }
            }
        }

        return sb.toString().isBlank() ? "Pipeline completed. See details in admin console." : sb.toString().strip();
    }

    private String parseAdminUrl(String fullOutput, List<String> lines) {
        // Priority 1: parse stable machine-readable marker PIPELINE_ADMIN_QUEUE_URL=<url>
        // Example output from CLI:
        //   PIPELINE_ADMIN_QUEUE_URL=/admin/staging-moderation?importRunId=45&province=Khanh%20Hoa&city=Nha%20Trang
        for (String line : lines) {
            if (line.startsWith("PIPELINE_ADMIN_QUEUE_URL=")) {
                String url = line.substring("PIPELINE_ADMIN_QUEUE_URL=".length()).strip();
                return url.isEmpty() ? null : url;
            }
        }

        // Priority 2 fallback: parse human-readable "Suggested Admin UI Filter URL:" section
        for (String line : lines) {
            if (line.contains("/admin/staging-moderation?")) {
                int idx = line.indexOf("/admin/staging-moderation?");
                String url = line.substring(idx).strip();
                int qIdx = url.indexOf('?');
                if (qIdx >= 0) {
                    String base = url.substring(0, qIdx + 1);
                    String query = url.substring(qIdx + 1);
                    query = query.replace(" ", "%20");
                    return base + query;
                }
                return url;
            }
        }
        return null;
    }

    /**
     * Parse import run ID from CLI stable marker output: PIPELINE_IMPORT_RUN_ID=&lt;id&gt;
     * This marker is printed by the Python CLI after import step completes successfully.
     * Returns null if not found (e.g., dry-run or step != import).
     */
    private Long parsePipelineImportRunId(String fullOutput, List<String> lines) {
        for (String line : lines) {
            if (line.startsWith("PIPELINE_IMPORT_RUN_ID=")) {
                String value = line.substring("PIPELINE_IMPORT_RUN_ID=".length()).strip();
                if (!value.isEmpty()) {
                    try {
                        return Long.parseLong(value);
                    } catch (NumberFormatException e) {
                        log.warn("Failed to parse PIPELINE_IMPORT_RUN_ID from output: '{}' is not a valid long", value);
                        return null;
                    }
                }
            }
        }
        return null;
    }

    private String parseErrorMessage(String fullOutput, List<String> lines, int exitCode) {
        StringBuilder sb = new StringBuilder();
        sb.append("Process exited with code ").append(exitCode).append(".\n");
        int tailCount = 0;
        for (int i = lines.size() - 1; i >= 0 && tailCount < 10; i--, tailCount++) {
            String line = lines.get(i).strip();
            if (!line.isBlank()) {
                sb.append(line).append("\n");
            }
        }
        if (sb.length() > 500) {
            return sb.substring(0, 500) + "... (truncated)";
        }
        return sb.toString().isBlank() ? "Pipeline process failed with exit code " + exitCode : sb.toString().strip();
    }

    public CityPipelineRunResponse getRun(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new BusinessException("Pipeline run not found: " + id, "NOT_FOUND", org.springframework.http.HttpStatus.NOT_FOUND));
    }

    public List<CityPipelineRunResponse> listRecentRuns(int limit, int offset) {
        return repository.findRecent(limit, offset);
    }

    public int countRuns() {
        return repository.countRuns();
    }
}
