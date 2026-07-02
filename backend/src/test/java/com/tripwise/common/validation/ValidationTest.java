package com.tripwise.common.validation;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.hibernate.validator.messageinterpolation.ResourceBundleMessageInterpolator;
import org.hibernate.validator.resourceloading.PlatformResourceBundleLocator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ValidationTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.byDefaultProvider()
                .configure()
                .messageInterpolator(
                        new ResourceBundleMessageInterpolator(
                                new PlatformResourceBundleLocator("messages")
                        )
                )
                .buildValidatorFactory();
        validator = factory.getValidator();
    }

    static class TestDto {
        @ValidEmail
        private String email;

        @ValidPassword
        private String password;

        public TestDto(String email, String password) {
            this.email = email;
            this.password = password;
        }
    }

    @Test
    void testValidEmail() {
        TestDto dto = new TestDto("test@example.com", "ValidPass123");
        Set<ConstraintViolation<TestDto>> violations = validator.validate(dto);
        assertThat(violations).isEmpty();
    }

    @Test
    void testInvalidEmail() {
        TestDto dto = new TestDto("invalid-email", "ValidPass123");
        Set<ConstraintViolation<TestDto>> violations = validator.validate(dto);

        assertThat(violations).hasSize(1);
        ConstraintViolation<TestDto> violation = violations.iterator().next();
        assertThat(violation.getPropertyPath().toString()).isEqualTo("email");
        assertThat(violation.getMessage()).isEqualTo("Email không đúng định dạng");
    }

    @Test
    void testInvalidPassword_TooShort() {
        TestDto dto = new TestDto("test@example.com", "Short1");
        Set<ConstraintViolation<TestDto>> violations = validator.validate(dto);

        assertThat(violations).hasSize(1);
        ConstraintViolation<TestDto> violation = violations.iterator().next();
        assertThat(violation.getPropertyPath().toString()).isEqualTo("password");
        assertThat(violation.getMessage()).isEqualTo("Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số");
    }

    @Test
    void testInvalidPassword_NoNumber() {
        TestDto dto = new TestDto("test@example.com", "NoNumberPassword");
        Set<ConstraintViolation<TestDto>> violations = validator.validate(dto);

        assertThat(violations).hasSize(1);
    }

    @Test
    void testInvalidPassword_NoUppercase() {
        TestDto dto = new TestDto("test@example.com", "nouppercase123");
        Set<ConstraintViolation<TestDto>> violations = validator.validate(dto);

        assertThat(violations).hasSize(1);
    }
}
