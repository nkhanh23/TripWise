package com.tripwise.common.exception;

import com.tripwise.common.api.ErrorResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String CORRELATION_ID_KEY = "correlationId";

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
        String correlationId = MDC.get(CORRELATION_ID_KEY);
        log.warn("[BusinessException] CorrelationId: {}, ErrorCode: {}, Message: {}",
                correlationId, ex.getErrorCode(), ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(ex.getHttpStatus().value())
                .error(ex.getHttpStatus().getReasonPhrase())
                .message(ex.getMessage())
                .errorCode(ex.getErrorCode())
                .correlationId(correlationId)
                .build();

        return new ResponseEntity<>(errorResponse, ex.getHttpStatus());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        String correlationId = MDC.get(CORRELATION_ID_KEY);
        log.warn("[ValidationException] CorrelationId: {}, Error count: {}", correlationId, ex.getErrorCount());

        List<ErrorResponse.ValidationError> validationErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> new ErrorResponse.ValidationError(error.getField(), error.getDefaultMessage()))
                .collect(Collectors.toList());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .message("Dá»¯ liá»‡u Ä‘áº§u vÃ o khÃ´ng há»£p lá»‡")
                .errorCode("VALIDATION_ERROR")
                .correlationId(correlationId)
                .details(validationErrors)
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<ErrorResponse> handleBindException(BindException ex) {
        String correlationId = MDC.get(CORRELATION_ID_KEY);
        log.warn("[BindException] CorrelationId: {}, Error count: {}", correlationId, ex.getErrorCount());

        List<ErrorResponse.ValidationError> validationErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> new ErrorResponse.ValidationError(error.getField(), error.getDefaultMessage()))
                .collect(Collectors.toList());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .message("Dá»¯ liá»‡u Ä‘áº§u vÃ o khÃ´ng há»£p lá»‡")
                .errorCode("VALIDATION_ERROR")
                .correlationId(correlationId)
                .details(validationErrors)
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler({ConstraintViolationException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<ErrorResponse> handleRequestValidationException(Exception ex) {
        String correlationId = MDC.get(CORRELATION_ID_KEY);
        log.warn("[RequestValidationException] CorrelationId: {}, Message: {}", correlationId, ex.getMessage());

        List<ErrorResponse.ValidationError> validationErrors;
        if (ex instanceof ConstraintViolationException constraintViolationException) {
            validationErrors = constraintViolationException.getConstraintViolations()
                    .stream()
                    .map(error -> new ErrorResponse.ValidationError(
                            extractFieldName(error.getPropertyPath().toString()),
                            error.getMessage()
                    ))
                    .collect(Collectors.toList());
        } else {
            MissingServletRequestParameterException missingServletRequestParameterException =
                    (MissingServletRequestParameterException) ex;
            validationErrors = List.of(new ErrorResponse.ValidationError(
                    missingServletRequestParameterException.getParameterName(),
                    "Parameter is required"
            ));
        }

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .message("Dá»¯ liá»‡u Ä‘áº§u vÃ o khÃ´ng há»£p lá»‡")
                .errorCode("VALIDATION_ERROR")
                .correlationId(correlationId)
                .details(validationErrors)
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex) {
        String correlationId = MDC.get(CORRELATION_ID_KEY);
        log.error("[SystemError] CorrelationId: {} - Unexpected system error", correlationId, ex);

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error(HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase())
                .message("ÄÃ£ xáº£y ra lá»—i há»‡ thá»‘ng. Vui lÃ²ng thá»­ láº¡i sau.")
                .errorCode("SYSTEM_ERROR")
                .correlationId(correlationId)
                .build();

        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private String extractFieldName(String propertyPath) {
        int lastDotIndex = propertyPath.lastIndexOf('.');
        return lastDotIndex >= 0 ? propertyPath.substring(lastDotIndex + 1) : propertyPath;
    }
}
