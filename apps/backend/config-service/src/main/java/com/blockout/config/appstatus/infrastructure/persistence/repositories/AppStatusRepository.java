package com.blockout.config.appstatus.infrastructure.persistence.repositories;

import com.blockout.config.appstatus.infrastructure.persistence.entities.AppStatusEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Persists the app-status singleton. */
public interface AppStatusRepository extends JpaRepository<AppStatusEntity, Long> {

    /** Returns the first and authoritative singleton row. */
    Optional<AppStatusEntity> findFirstByOrderByIdAsc();
}
