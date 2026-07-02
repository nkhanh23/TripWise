package com.tripwise.trip.infrastructure.persistence.repository;

import com.tripwise.trip.domain.entity.Trip;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

    Page<Trip> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<Trip> findByUserId(Long userId);
}
