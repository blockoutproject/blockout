package com.blockout.config.repositories;

import com.blockout.config.models.ScraperStatus;
import com.blockout.config.models.enums.ScraperName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ScraperStatusRepository extends JpaRepository<ScraperStatus, Long> {
    Optional<ScraperStatus> findByName(ScraperName name);
}