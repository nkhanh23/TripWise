package com.tripwise.ai;

import com.tripwise.BaseIntegrationTest;
import com.tripwise.ai.application.dto.ParsedTripRequest;
import com.tripwise.ai.application.service.ParseTripRequirementUseCase;
import com.tripwise.ai.infrastructure.GeminiClient;
import com.tripwise.ai.infrastructure.dto.GeminiRequest;
import com.tripwise.ai.infrastructure.dto.GeminiResponse;
import com.tripwise.common.exception.ExternalServiceException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ActiveProfiles("test")
class AiIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private ParseTripRequirementUseCase parseTripRequirementUseCase;

    @MockBean
    private GeminiClient geminiClient;

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
    void testVietnameseInputFormats_WordyInput_ShouldSucceed() {
        String userInput = "Tôi muốn lên kế hoạch đi Nha Trang nghỉ dưỡng 4 ngày 3 đêm cho gia đình, thích ăn hải sản và tắm biển.";
        String jsonText = """
                {
                  "destination": "Nha Trang",
                  "numDays": 4,
                  "numNights": 3,
                  "budgetLevel": "MID_RANGE",
                  "interests": ["biển", "ẩm thực"],
                  "preferences": "nghỉ dưỡng cho gia đình, ăn hải sản, tắm biển"
                }
                """;

        when(geminiClient.generateContent(any(GeminiRequest.class))).thenReturn(createMockResponse(jsonText));

        ParsedTripRequest result = parseTripRequirementUseCase.execute(userInput);

        assertNotNull(result);
        assertEquals("Nha Trang", result.getDestination());
        assertEquals(4, result.getNumDays());
        assertEquals(3, result.getNumNights());
        assertTrue(result.getInterests().contains("biển"));
    }

    @Test
    void testVietnameseInputFormats_ShortInput_ShouldSucceed() {
        String userInput = "Nha Trang 3n2d, gia re";
        String jsonText = """
                {
                  "destination": "Nha Trang",
                  "numDays": 3,
                  "numNights": 2,
                  "budgetLevel": "BUDGET",
                  "interests": ["biển"],
                  "preferences": "giá rẻ"
                }
                """;

        when(geminiClient.generateContent(any(GeminiRequest.class))).thenReturn(createMockResponse(jsonText));

        ParsedTripRequest result = parseTripRequirementUseCase.execute(userInput);

        assertNotNull(result);
        assertEquals("Nha Trang", result.getDestination());
        assertEquals("BUDGET", result.getBudgetLevel());
    }

    @Test
    void testErrorScenarios_MissingDestination_ShouldThrowParsingFailedException() {
        String userInput = "Lịch trình đi chơi 2 ngày";
        String jsonText = """
                {
                  "destination": null,
                  "numDays": 2,
                  "budgetLevel": "MID_RANGE",
                  "interests": [],
                  "preferences": ""
                }
                """;

        when(geminiClient.generateContent(any(GeminiRequest.class))).thenReturn(createMockResponse(jsonText));

        ExternalServiceException ex = assertThrows(
                ExternalServiceException.class,
                () -> parseTripRequirementUseCase.execute(userInput)
        );

        assertEquals("AI_PARSING_FAILED", ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Không thể phân tích yêu cầu du lịch"));
    }

    @Test
    void testErrorScenarios_GeminiConnectionRefused_ShouldThrowServiceUnavailableException() {
        String userInput = "Nha Trang 3 ngày";

        when(geminiClient.generateContent(any(GeminiRequest.class))).thenThrow(new RuntimeException("Connection refused by Google API"));

        ExternalServiceException ex = assertThrows(
                ExternalServiceException.class,
                () -> parseTripRequirementUseCase.execute(userInput)
        );

        assertEquals("AI_SERVICE_UNAVAILABLE", ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Dịch vụ AI hiện tại không khả dụng"));
    }
}
