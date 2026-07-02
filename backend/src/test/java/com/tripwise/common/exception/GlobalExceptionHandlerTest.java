package com.tripwise.common.exception;

import com.tripwise.common.api.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler();

    @Test
    void shouldHandleResourceNotFoundException() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Not found");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleBusinessException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("RESOURCE_NOT_FOUND");
        assertThat(response.getBody().getMessage()).isEqualTo("Not found");
    }

    @Test
    void shouldHandleUnauthorizedException() {
        UnauthorizedException ex = new UnauthorizedException("Unauthorized");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleBusinessException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("UNAUTHORIZED");
        assertThat(response.getBody().getMessage()).isEqualTo("Unauthorized");
    }

    @Test
    void shouldHandleForbiddenException() {
        ForbiddenException ex = new ForbiddenException("Forbidden");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleBusinessException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("FORBIDDEN");
        assertThat(response.getBody().getMessage()).isEqualTo("Forbidden");
    }

    @Test
    void shouldHandleConflictException() {
        ConflictException ex = new ConflictException("Conflict");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleBusinessException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("CONFLICT");
        assertThat(response.getBody().getMessage()).isEqualTo("Conflict");
    }

    @Test
    void shouldHandleExternalServiceException() {
        ExternalServiceException ex = new ExternalServiceException("External error");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleBusinessException(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("EXTERNAL_SERVICE_ERROR");
        assertThat(response.getBody().getMessage()).isEqualTo("External error");
    }
}
