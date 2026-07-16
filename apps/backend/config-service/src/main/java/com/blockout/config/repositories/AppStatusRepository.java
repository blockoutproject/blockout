package com.blockout.config.repositories;

import com.blockout.config.models.entities.AppStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppStatusRepository extends JpaRepository<AppStatus, Long> {

    Optional<AppStatus> findFirstByOrderByIdAsc();
}