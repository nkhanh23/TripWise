package com.tripwise.common.exception;

import org.springframework.http.HttpStatus;

public class TooManyRequestsException extends BusinessException {

    public TooManyRequestsException(String message) {
        super(message, "TOO_MANY_REQUESTS", HttpStatus.TOO_MANY_REQUESTS);
    }
}
