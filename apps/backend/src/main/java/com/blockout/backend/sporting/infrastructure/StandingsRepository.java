package com.blockout.backend.sporting.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Native persistence of the pool's current publication evidence and owned table. */
interface StandingsRepository extends JpaRepository<StandingsEntity, UUID> {}
