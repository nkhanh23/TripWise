package com.tripwise.ai.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.ai.application.dto.ParsedTripRequest;
import com.tripwise.ai.infrastructure.GeminiClient;
import com.tripwise.ai.infrastructure.dto.GeminiRequest;
import com.tripwise.ai.infrastructure.dto.GeminiResponse;
import com.tripwise.common.exception.ExternalServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParseTripRequirementUseCase {

    private final GeminiClient geminiClient;
    private final TripParsingPromptBuilder promptBuilder;
    private final AiOutputValidator aiOutputValidator;
    private final ObjectMapper objectMapper;

    public ParsedTripRequest execute(String userInput) {
        if (userInput == null || userInput.trim().isEmpty()) {
            throw new IllegalArgumentException("Yêu cầu du lịch không được để trống");
        }

        GeminiRequest request = promptBuilder.buildRequest(userInput);
        int maxAttempts = 2;
        Throwable lastException = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                log.info("Attempting to parse user travel request, attempt: {}/{}", attempt, maxAttempts);
                GeminiResponse response = geminiClient.generateContent(request);
                String jsonText = extractJsonText(response);
                String cleanJson = cleanJsonText(jsonText);
                
                ParsedTripRequest parsedRequest = objectMapper.readValue(cleanJson, ParsedTripRequest.class);
                aiOutputValidator.validate(parsedRequest);
                
                log.info("Successfully parsed and validated travel request: {}", parsedRequest);
                return parsedRequest;
            } catch (Throwable e) {
                log.warn("Attempt {}/{} failed to parse or validate travel request: {}", attempt, maxAttempts, e.getMessage());
                lastException = e;
            }
        }

        log.error("Failed to parse travel request after {} attempts", maxAttempts);
        
        if (isGeminiDown(lastException)) {
            throw new ExternalServiceException("Dịch vụ AI hiện tại không khả dụng. Vui lòng thử lại sau.", "AI_SERVICE_UNAVAILABLE");
        } else {
            throw new ExternalServiceException(
                    "Không thể phân tích yêu cầu du lịch của bạn. Vui lòng nhập chi tiết hơn (ví dụ: địa điểm, số ngày, sở thích).",
                    "AI_PARSING_FAILED"
            );
        }
    }

    private String extractJsonText(GeminiResponse response) {
        if (response == null || response.getCandidates() == null || response.getCandidates().isEmpty()) {
            throw new ExternalServiceException("Phản hồi từ Gemini không có dữ liệu kết quả");
        }

        GeminiResponse.Candidate candidate = response.getCandidates().getFirst();
        if (candidate.getContent() == null || candidate.getContent().getParts() == null || candidate.getContent().getParts().isEmpty()) {
            throw new ExternalServiceException("Phản hồi từ Gemini không chứa nội dung phân tích");
        }

        return candidate.getContent().getParts().getFirst().getText();
    }

    private String cleanJsonText(String jsonText) {
        if (jsonText == null) {
            return "";
        }
        String clean = jsonText.trim();
        if (clean.startsWith("```json")) {
            clean = clean.substring(7);
        } else if (clean.startsWith("```")) {
            clean = clean.substring(3);
        }
        if (clean.endsWith("```")) {
            clean = clean.substring(0, clean.length() - 3);
        }
        return clean.trim();
    }

    private boolean isGeminiDown(Throwable throwable) {
        if (throwable == null) {
            return false;
        }
        String msg = throwable.getMessage();
        if (msg == null) {
            return false;
        }
        String lowerMsg = msg.toLowerCase();
        return lowerMsg.contains("connection") 
                || lowerMsg.contains("timeout") 
                || lowerMsg.contains("refused") 
                || lowerMsg.contains("unavailable") 
                || lowerMsg.contains("502") 
                || lowerMsg.contains("503") 
                || lowerMsg.contains("504") 
                || lowerMsg.contains("gateway")
                || lowerMsg.contains("connect");
    }
}
