package com.blockout.config.scraperstatus.persistence;

import com.blockout.shared.model.ScraperNameEnum;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScraperStatusRepository extends JpaRepository<ScraperStatusEntity, Long> {

    Optional<ScraperStatusEntity> findByName(ScraperNameEnum name);
}
