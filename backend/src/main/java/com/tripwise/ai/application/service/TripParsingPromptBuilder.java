package com.tripwise.ai.application.service;

import com.tripwise.ai.infrastructure.dto.GeminiRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@Service
public class TripParsingPromptBuilder {

    private final String systemPrompt;

    public TripParsingPromptBuilder() {
        String loadedPrompt;
        try {
            ClassPathResource resource = new ClassPathResource("prompts/trip-parsing-system.txt");
            loadedPrompt = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
            log.info("System prompt loaded successfully from resources.");
        } catch (IOException e) {
            log.error("Failed to load system prompt from resource, falling back to default.", e);
            loadedPrompt = "Bạn là trợ lý du lịch AI phân tích yêu cầu bằng tiếng Việt và xuất ra JSON.";
        }
        this.systemPrompt = loadedPrompt;
    }

    public String getSystemPrompt() {
        return systemPrompt;
    }

    public String buildUserPrompt(String userInput) {
        if (userInput == null || userInput.trim().isEmpty()) {
            throw new IllegalArgumentException("User input request must not be empty");
        }
        return userInput.trim();
    }

    public GeminiRequest buildRequest(String userInput) {
        String cleanInput = buildUserPrompt(userInput);

        return GeminiRequest.builder()
                .systemInstruction(GeminiRequest.SystemInstruction.builder()
                        .parts(List.of(
                                GeminiRequest.Part.builder()
                                        .text(systemPrompt)
                                        .build()
                        ))
                        .build())
                .contents(List.of(
                        GeminiRequest.Content.builder()
                                .role("user")
                                .parts(List.of(
                                        GeminiRequest.Part.builder()
                                                .text(cleanInput)
                                                .build()
                                ))
                                .build()
                ))
                .generationConfig(GeminiRequest.GenerationConfig.builder()
                        .responseMimeType("application/json")
                        .build())
                .build();
    }
}
