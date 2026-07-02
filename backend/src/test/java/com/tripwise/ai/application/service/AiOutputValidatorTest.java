package com.tripwise.ai.application.service;

import com.tripwise.ai.application.dto.ParsedTripRequest;
import com.tripwise.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AiOutputValidatorTest {

    private AiOutputValidator validator;

    @BeforeEach
    void setUp() {
        validator = new AiOutputValidator();
    }

    @Test
    void validate_WithNullRequest_ShouldThrowException() {
        BusinessException exception = assertThrows(BusinessException.class, () -> validator.validate(null));
        assertEquals("Dữ liệu phân tích từ AI bị rỗng", exception.getMessage());
    }

    @Test
    void validate_WithNullDestination_ShouldThrowException() {
        ParsedTripRequest request = ParsedTripRequest.builder()
                .destination(null)
                .numDays(3)
                .build();
        BusinessException exception = assertThrows(BusinessException.class, () -> validator.validate(request));
        assertEquals("Không tìm thấy điểm đến trong phân tích của AI", exception.getMessage());
    }

    @Test
    void validate_WithEmptyDestination_ShouldThrowException() {
        ParsedTripRequest request = ParsedTripRequest.builder()
                .destination("   ")
                .numDays(3)
                .build();
        BusinessException exception = assertThrows(BusinessException.class, () -> validator.validate(request));
        assertEquals("Không tìm thấy điểm đến trong phân tích của AI", exception.getMessage());
    }

    @Test
    void validate_WithZeroNumDays_ShouldThrowException() {
        ParsedTripRequest request = ParsedTripRequest.builder()
                .destination("Nha Trang")
                .numDays(0)
                .build();
        BusinessException exception = assertThrows(BusinessException.class, () -> validator.validate(request));
        assertEquals("Số ngày du lịch phải lớn hơn 0", exception.getMessage());
    }

    @Test
    void validate_WithNegativeNumDays_ShouldThrowException() {
        ParsedTripRequest request = ParsedTripRequest.builder()
                .destination("Nha Trang")
                .numDays(-2)
                .build();
        BusinessException exception = assertThrows(BusinessException.class, () -> validator.validate(request));
        assertEquals("Số ngày du lịch phải lớn hơn 0", exception.getMessage());
    }

    @Test
    void validate_WithNegativeNumNights_ShouldThrowException() {
        ParsedTripRequest request = ParsedTripRequest.builder()
                .destination("Nha Trang")
                .numDays(3)
                .numNights(-1)
                .build();
        BusinessException exception = assertThrows(BusinessException.class, () -> validator.validate(request));
        assertEquals("Số đêm du lịch không được là số âm", exception.getMessage());
    }

    @Test
    void validate_WithInvalidBudgetLevel_ShouldThrowException() {
        ParsedTripRequest request = ParsedTripRequest.builder()
                .destination("Nha Trang")
                .numDays(3)
                .budgetLevel("CHEAP")
                .build();
        BusinessException exception = assertThrows(BusinessException.class, () -> validator.validate(request));
        assertTrue(exception.getMessage().contains("Mức ngân sách không hợp lệ"));
    }

    @Test
    void validate_WithValidRequest_ShouldPassSilently() {
        ParsedTripRequest request = ParsedTripRequest.builder()
                .destination("Nha Trang")
                .numDays(3)
                .numNights(2)
                .budgetLevel("MID_RANGE")
                .interests(List.of("biển", "ẩm thực"))
                .preferences("đi buổi tối")
                .build();
        assertDoesNotThrow(() -> validator.validate(request));
    }
}
