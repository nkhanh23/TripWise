package com.tripwise.user.infrastructure.persistence.repository;

import com.tripwise.common.infrastructure.persistence.config.JpaAuditConfig;
import com.tripwise.user.domain.entity.User;
import com.tripwise.user.domain.enums.Role;
import com.tripwise.user.domain.enums.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
    "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("test")
@Import(JpaAuditConfig.class)
@EntityScan(basePackageClasses = User.class)
@EnableJpaRepositories(basePackageClasses = UserRepository.class)
class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldFindUserByEmail() {
        // Arrange
        User user = User.builder()
                .email("test@example.com")
                .passwordHash("hashed_password")
                .fullName("Test User")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();
        
        entityManager.persistAndFlush(user);

        // Act
        Optional<User> foundUser = userRepository.findByEmail("test@example.com");

        // Assert
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo("test@example.com");
        assertThat(foundUser.get().getFullName()).isEqualTo("Test User");
    }

    @Test
    void shouldReturnEmptyIfUserEmailDoesNotExist() {
        // Act
        Optional<User> foundUser = userRepository.findByEmail("nonexistent@example.com");

        // Assert
        assertThat(foundUser).isEmpty();
    }

    @Test
    void shouldReturnTrueIfExistsByEmail() {
        // Arrange
        User user = User.builder()
                .email("exists@example.com")
                .passwordHash("hashed_password")
                .build();
        
        entityManager.persistAndFlush(user);

        // Act
        boolean exists = userRepository.existsByEmail("exists@example.com");

        // Assert
        assertThat(exists).isTrue();
    }

    @Test
    void shouldReturnFalseIfNotExistsByEmail() {
        // Act
        boolean exists = userRepository.existsByEmail("nonexistent@example.com");

        // Assert
        assertThat(exists).isFalse();
    }
}
