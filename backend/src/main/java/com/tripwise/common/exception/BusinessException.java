package com.tripwise.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class BusinessException extends RuntimeException {

    private final String errorCode;
    private final HttpStatus httpStatus;
    private final Object detailsData;

    public BusinessException(String message, String errorCode, HttpStatus httpStatus, Object detailsData) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
        this.detailsData = detailsData;
    }

    public BusinessException(String message, String errorCode, HttpStatus httpStatus) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
        this.detailsData = null;
    }

    public BusinessException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = HttpStatus.BAD_REQUEST;
        this.detailsData = null;
    }
}
