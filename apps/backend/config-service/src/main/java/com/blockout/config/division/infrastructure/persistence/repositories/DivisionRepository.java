package com.blockout.config.division.infrastructure.persistence.repositories;

import com.blockout.config.division.infrastructure.persistence.entities.DivisionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Persists divisions.
 */
public interface DivisionRepository extends JpaRepository<DivisionEntity, Long> {

    /**
     * Finds a division by case-insensitive name for duplicate protection.
     */
    Optional<DivisionEntity> findByNameIgnoreCase(String name);
}
