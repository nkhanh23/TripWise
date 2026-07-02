package com.tripwise.ai.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripwise.ai.application.dto.ParsedTripRequest;
import com.tripwise.ai.infrastructure.GeminiClient;
import com.tripwise.ai.infrastructure.dto.GeminiRequest;
import com.tripwise.ai.infrastructure.dto.GeminiResponse;
import com.tripwise.common.exception.ExternalServiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ParseTripRequirementUseCaseTest {

    @Mock
    private GeminiClient geminiClient;

    @Mock
    private TripParsingPromptBuilder promptBuilder;

    private AiOutputValidator aiOutputValidator;
    private ObjectMapper objectMapper;
    private ParseTripRequirementUseCase useCase;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        aiOutputValidator = new AiOutputValidator();
        useCase = new ParseTripRequirementUseCase(geminiClient, promptBuilder, aiOutputValidator, objectMapper);
    }

    private GeminiResponse createMockResponse(String text) {
        GeminiResponse response = new GeminiResponse();
        GeminiResponse.Candidate candidate = new GeminiResponse.Candidate();
        GeminiResponse.Content content = new GeminiResponse.Content();
        GeminiResponse.Part part = new GeminiResponse.Part();
        part.setText(text);
        content.setParts(List.of(part));
        candidate.setContent(content);
        response.setCandidates(List.of(candidate));
        return response;
    }

    @Test
    void execute_WithHappyPath_ShouldReturnParsedRequest() {
        String userInput = "Nha Trang 3 ngày";
        GeminiRequest mockRequest = new GeminiRequest();
        when(promptBuilder.buildRequest(userInput)).thenReturn(mockRequest);

        String jsonText = """
                {
                  "destination": "Nha Trang",
                  "numDays": 3,
                  "numNights": 2,
                  "budgetLevel": "MID_RANGE",
                  "interests": ["biển"],
                  "preferences": ""
                }
                """;
        GeminiResponse mockResponse = createMockResponse(jsonText);
        when(geminiClient.generateContent(mockRequest)).thenReturn(mockResponse);

        ParsedTripRequest result = useCase.execute(userInput);

        assertNotNull(result);
        assertEquals("Nha Trang", result.getDestination());
        assertEquals(3, result.getNumDays());
        assertEquals(2, result.getNumNights());
        assertEquals("MID_RANGE", result.getBudgetLevel());
        assertEquals(List.of("biển"), result.getInterests());
        verify(geminiClient, times(1)).generateContent(mockRequest);
    }

    @Test
    void execute_WithInvalidSchemaAndThenSuccess_ShouldRetryAndSucceed() {
        String userInput = "Nha Trang 3 ngày";
        GeminiRequest mockRequest = new GeminiRequest();
        when(promptBuilder.buildRequest(userInput)).thenReturn(mockRequest);

        // First attempt returns invalid data (numDays <= 0)
        String invalidJson = """
                {
                  "destination": "Nha Trang",
                  "numDays": 0
                }
                """;
        // Second attempt returns valid data
        String validJson = """
                {
                  "destination": "Nha Trang",
                  "numDays": 3
                }
                """;

        GeminiResponse firstResponse = createMockResponse(invalidJson);
        GeminiResponse secondResponse = createMockResponse(validJson);

        when(geminiClient.generateContent(mockRequest))
                .thenReturn(firstResponse)
                .thenReturn(secondResponse);

        ParsedTripRequest result = useCase.execute(userInput);

        assertNotNull(result);
        assertEquals("Nha Trang", result.getDestination());
        assertEquals(3, result.getNumDays());
        verify(geminiClient, times(2)).generateContent(mockRequest);
    }

    @Test
    void execute_GeminiIsDown_ShouldThrowExternalServiceExceptionWithUnavailableCode() {
        String userInput = "Nha Trang 3 ngày";
        GeminiRequest mockRequest = new GeminiRequest();
        when(promptBuilder.buildRequest(userInput)).thenReturn(mockRequest);

        when(geminiClient.generateContent(mockRequest))
                .thenThrow(new RuntimeException("Connection timed out"))
                .thenThrow(new RuntimeException("Connect refused"));

        ExternalServiceException ex = assertThrows(ExternalServiceException.class, () -> useCase.execute(userInput));
        assertEquals("AI_SERVICE_UNAVAILABLE", ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Dịch vụ AI hiện tại không khả dụng"));
        verify(geminiClient, times(2)).generateContent(mockRequest);
    }

    @Test
    void execute_ParsingAlwaysFails_ShouldThrowExternalServiceExceptionWithParsingFailedCode() {
        String userInput = "Nha Trang 3 ngày";
        GeminiRequest mockRequest = new GeminiRequest();
        when(promptBuilder.buildRequest(userInput)).thenReturn(mockRequest);

        String invalidJson = "{ invalid json }";
        GeminiResponse response = createMockResponse(invalidJson);
        when(geminiClient.generateContent(mockRequest)).thenReturn(response);

        ExternalServiceException ex = assertThrows(ExternalServiceException.class, () -> useCase.execute(userInput));
        assertEquals("AI_PARSING_FAILED", ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Không thể phân tích yêu cầu du lịch của bạn"));
        verify(geminiClient, times(2)).generateContent(mockRequest);
    }

    @Test
    void execute_WithInvalidInput_ShouldThrowIllegalArgumentException() {
        assertThrows(IllegalArgumentException.class, () -> useCase.execute(""));
        assertThrows(IllegalArgumentException.class, () -> useCase.execute(null));
        verifyNoInteractions(geminiClient);
        verifyNoInteractions(promptBuilder);
    }
}
