package com.tripwise.ai.infrastructure;

import com.tripwise.ai.infrastructure.config.GeminiProperties;
import com.tripwise.ai.infrastructure.dto.GeminiRequest;
import com.tripwise.ai.infrastructure.dto.GeminiResponse;
import com.tripwise.common.exception.ExternalServiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GeminiClientTest {

    @Mock
    private RestClient restClient;

    @Mock
    private RestClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private RestClient.RequestBodySpec requestBodySpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    private GeminiProperties geminiProperties;
    private GeminiClient geminiClient;

    @BeforeEach
    void setUp() {
        geminiProperties = new GeminiProperties();
        geminiProperties.setApiKey("test-key");
        geminiProperties.setApiUrl("http://localhost:8089");
        geminiProperties.setModel("gemini-1.5-flash");
        geminiProperties.setTimeout(Duration.ofSeconds(5));

        geminiClient = new GeminiClient(geminiProperties);
        ReflectionTestUtils.setField(geminiClient, "restClient", restClient);
    }

    @Test
    void generateContent_WithRequest_ShouldReturnResponse() {
        GeminiRequest request = GeminiRequest.builder()
                .contents(List.of(
                        GeminiRequest.Content.builder()
                                .parts(List.of(
                                        GeminiRequest.Part.builder().text("Hello").build()
                                ))
                                .build()
                ))
                .build();

        GeminiResponse expectedResponse = new GeminiResponse();
        GeminiResponse.Candidate candidate = new GeminiResponse.Candidate();
        GeminiResponse.Content content = new GeminiResponse.Content();
        GeminiResponse.Part part = new GeminiResponse.Part();
        part.setText("World");
        content.setParts(List.of(part));
        candidate.setContent(content);
        expectedResponse.setCandidates(List.of(candidate));

        when(restClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.body(any(GeminiRequest.class))).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(GeminiResponse.class)).thenReturn(expectedResponse);

        GeminiResponse actualResponse = geminiClient.generateContent(request);

        assertNotNull(actualResponse);
        assertEquals(1, actualResponse.getCandidates().size());
        assertEquals("World", actualResponse.getCandidates().get(0).getContent().getParts().get(0).getText());
        verify(restClient, times(1)).post();
    }

    @Test
    void generateContent_WithPromptString_ShouldReturnText() {
        GeminiResponse expectedResponse = new GeminiResponse();
        GeminiResponse.Candidate candidate = new GeminiResponse.Candidate();
        GeminiResponse.Content content = new GeminiResponse.Content();
        GeminiResponse.Part part = new GeminiResponse.Part();
        part.setText("Response text");
        content.setParts(List.of(part));
        candidate.setContent(content);
        expectedResponse.setCandidates(List.of(candidate));

        when(restClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.body(any(GeminiRequest.class))).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(GeminiResponse.class)).thenReturn(expectedResponse);

        String result = geminiClient.generateContent("Hello");

        assertEquals("Response text", result);
    }

    @Test
    void generateContent_WithApiError_ShouldThrowExternalServiceException() {
        when(restClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.body(any(GeminiRequest.class))).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(GeminiResponse.class)).thenThrow(new RuntimeException("Connection timeout"));

        assertThrows(ExternalServiceException.class, () -> geminiClient.generateContent("Hello"));
    }

    @Test
    void generateContent_WithEmptyResponse_ShouldThrowExternalServiceException() {
        GeminiResponse expectedResponse = new GeminiResponse();
        expectedResponse.setCandidates(new ArrayList<>());

        when(restClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.body(any(GeminiRequest.class))).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(GeminiResponse.class)).thenReturn(expectedResponse);

        assertThrows(ExternalServiceException.class, () -> geminiClient.generateContent("Hello"));
    }
}
