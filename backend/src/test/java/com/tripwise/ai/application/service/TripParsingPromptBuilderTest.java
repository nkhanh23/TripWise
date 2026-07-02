package com.tripwise.ai.application.service;

import com.tripwise.ai.infrastructure.dto.GeminiRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TripParsingPromptBuilderTest {

    private TripParsingPromptBuilder builder;

    @BeforeEach
    void setUp() {
        builder = new TripParsingPromptBuilder();
    }

    @Test
    void getSystemPrompt_ShouldReturnLoadedPrompt() {
        String systemPrompt = builder.getSystemPrompt();
        assertNotNull(systemPrompt);
        assertFalse(systemPrompt.isEmpty());
        assertTrue(systemPrompt.contains("TripWise"));
        assertTrue(systemPrompt.contains("JSON Schema"));
    }

    @Test
    void buildUserPrompt_WithValidInput_ShouldReturnTrimmedInput() {
        String input = "  Tôi muốn đi Nha Trang 3 ngày   ";
        String output = builder.buildUserPrompt(input);
        assertEquals("Tôi muốn đi Nha Trang 3 ngày", output);
    }

    @Test
    void buildUserPrompt_WithInvalidInput_ShouldThrowException() {
        assertThrows(IllegalArgumentException.class, () -> builder.buildUserPrompt(null));
        assertThrows(IllegalArgumentException.class, () -> builder.buildUserPrompt("   "));
    }

    @Test
    void buildRequest_ShouldBuildValidGeminiRequest() {
        String input = "Tôi muốn đi Nha Trang";
        GeminiRequest request = builder.buildRequest(input);

        assertNotNull(request);
        assertNotNull(request.getSystemInstruction());
        assertEquals(1, request.getSystemInstruction().getParts().size());
        assertEquals(builder.getSystemPrompt(), request.getSystemInstruction().getParts().get(0).getText());

        assertNotNull(request.getContents());
        assertEquals(1, request.getContents().size());
        assertEquals("user", request.getContents().get(0).getRole());
        assertEquals(1, request.getContents().get(0).getParts().size());
        assertEquals(input, request.getContents().get(0).getParts().get(0).getText());

        assertNotNull(request.getGenerationConfig());
        assertEquals("application/json", request.getGenerationConfig().getResponseMimeType());
    }
}
