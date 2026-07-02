package com.tripwise.common.security;

import com.tripwise.auth.infrastructure.security.JwtProperties;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class JwtPropertiesValidationTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void shouldRejectTooShortJwtSecret() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("short-secret");

        Set<ConstraintViolation<JwtProperties>> violations = validator.validate(properties);

        assertThat(violations)
                .extracting(ConstraintViolation::getMessage)
                .contains("JWT secret must be at least 32 characters long");
    }
}
