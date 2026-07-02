package com.tripwise.common.exception;

import org.springframework.http.HttpStatus;

public class ExternalServiceException extends BusinessException {

    public ExternalServiceException(String message) {
        super(message, "EXTERNAL_SERVICE_ERROR", HttpStatus.BAD_GATEWAY);
    }

    public ExternalServiceException(String message, String errorCode) {
        super(message, errorCode, HttpStatus.BAD_GATEWAY);
    }
}
