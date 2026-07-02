package com.tripwise.common.exception;

import org.springframework.http.HttpStatus;

public class ForbiddenException extends BusinessException {

    public ForbiddenException(String message) {
        super(message, "FORBIDDEN", HttpStatus.FORBIDDEN);
    }

    public ForbiddenException(String message, String errorCode) {
        super(message, errorCode, HttpStatus.FORBIDDEN);
    }
}
