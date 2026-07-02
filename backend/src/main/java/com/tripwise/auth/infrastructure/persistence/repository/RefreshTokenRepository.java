package com.tripwise.auth.infrastructure.persistence.repository;

import com.tripwise.auth.domain.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("""
            update RefreshToken rt
               set rt.revokedAt = :revokedAt
             where rt.user.id = :userId
               and rt.revokedAt is null
               and rt.expiresAt > :revokedAt
            """)
    int revokeAllActiveTokensByUserId(@Param("userId") Long userId, @Param("revokedAt") Instant revokedAt);
}
