package com.tripwise.ai.application.service;

import com.tripwise.ai.application.dto.ParsedTripRequest;
import com.tripwise.common.exception.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AiOutputValidator {

    public void validate(ParsedTripRequest request) {
        if (request == null) {
            throw new BusinessException("Dữ liệu phân tích từ AI bị rỗng", "AI_VALIDATION_ERROR", HttpStatus.BAD_GATEWAY);
        }

        if (request.getDestination() == null || request.getDestination().trim().isEmpty()) {
            throw new BusinessException("Không tìm thấy điểm đến trong phân tích của AI", "AI_VALIDATION_ERROR", HttpStatus.BAD_GATEWAY);
        }

        if (request.getNumDays() == null || request.getNumDays() <= 0) {
            throw new BusinessException("Số ngày du lịch phải lớn hơn 0", "AI_VALIDATION_ERROR", HttpStatus.BAD_GATEWAY);
        }

        if (request.getNumNights() != null && request.getNumNights() < 0) {
            throw new BusinessException("Số đêm du lịch không được là số âm", "AI_VALIDATION_ERROR", HttpStatus.BAD_GATEWAY);
        }

        if (request.getBudgetLevel() != null) {
            String budget = request.getBudgetLevel().toUpperCase();
            if (!budget.equals("BUDGET") && !budget.equals("MID_RANGE") && !budget.equals("LUXURY")) {
                throw new BusinessException(
                        "Mức ngân sách không hợp lệ trong phân tích của AI: " + request.getBudgetLevel(),
                        "AI_VALIDATION_ERROR",
                        HttpStatus.BAD_GATEWAY
                );
            }
        }
    }
}
