package com.blockout.backend.notifications.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Native personal entry persistence; application operations own original-account coordination. */
interface NotificationRepository extends JpaRepository<NotificationEntity, UUID> {}
