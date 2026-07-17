package com.blockout.config.appstatus.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppStatusRepository extends JpaRepository<AppStatusEntity, Long> {

    Optional<AppStatusEntity> findFirstByOrderByIdAsc();
}
