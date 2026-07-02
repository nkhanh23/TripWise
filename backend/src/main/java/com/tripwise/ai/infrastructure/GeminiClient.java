package com.tripwise.ai.infrastructure;

import com.tripwise.ai.infrastructure.config.GeminiProperties;
import com.tripwise.ai.infrastructure.dto.GeminiRequest;
import com.tripwise.ai.infrastructure.dto.GeminiResponse;
import com.tripwise.common.exception.ExternalServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

@Slf4j
@Component
public class GeminiClient {

    private final RestClient restClient;
    private final GeminiProperties geminiProperties;

    public GeminiClient(GeminiProperties geminiProperties) {
        this.geminiProperties = geminiProperties;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) geminiProperties.getTimeout().toMillis());
        requestFactory.setReadTimeout((int) geminiProperties.getTimeout().toMillis());

        this.restClient = RestClient.builder()
                .baseUrl(geminiProperties.getApiUrl())
                .requestFactory(requestFactory)
                .defaultHeader("x-goog-api-key", geminiProperties.getApiKey())
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public GeminiResponse generateContent(GeminiRequest request) {
        String path = "/models/" + geminiProperties.getModel() + ":generateContent";
        try {
            log.info("Calling Gemini API with model {}", geminiProperties.getModel());
            return restClient.post()
                    .uri(path)
                    .body(request)
                    .retrieve()
                    .body(GeminiResponse.class);
        } catch (Exception e) {
            log.error("Failed to generate content from Gemini API: {}", e.getMessage(), e);
            throw new ExternalServiceException("Lỗi khi kết nối với Gemini API: " + e.getMessage());
        }
    }

    public String generateContent(String prompt) {
        GeminiRequest request = GeminiRequest.builder()
                .contents(List.of(
                        GeminiRequest.Content.builder()
                                .parts(List.of(
                                        GeminiRequest.Part.builder()
                                                .text(prompt)
                                                .build()
                                ))
                                .build()
                ))
                .build();

        GeminiResponse response = generateContent(request);
        if (response == null || response.getCandidates() == null || response.getCandidates().isEmpty()) {
            throw new ExternalServiceException("Gemini returned an empty or invalid response");
        }

        GeminiResponse.Candidate candidate = response.getCandidates().getFirst();
        if (candidate.getContent() == null || candidate.getContent().getParts() == null || candidate.getContent().getParts().isEmpty()) {
            throw new ExternalServiceException("Gemini candidate is missing content parts");
        }

        return candidate.getContent().getParts().getFirst().getText();
    }
}
