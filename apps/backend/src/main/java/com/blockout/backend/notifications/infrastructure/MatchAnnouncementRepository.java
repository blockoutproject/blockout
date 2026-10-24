package com.blockout.backend.notifications.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Native persistence of nonpersonal allowances; callers already hold F02's match lock. */
interface MatchAnnouncementRepository extends JpaRepository<MatchAnnouncementEntity, UUID> {}
