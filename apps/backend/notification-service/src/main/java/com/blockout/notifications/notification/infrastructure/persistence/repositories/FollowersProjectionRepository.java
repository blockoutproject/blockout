package com.blockout.notifications.notification.infrastructure.persistence.repositories;

import com.blockout.notifications.notification.application.models.EntityType;
import com.blockout.notifications.notification.infrastructure.persistence.entities.FollowersProjectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FollowersProjectionRepository extends JpaRepository<FollowersProjectionEntity, Long> {

    boolean existsByEntityTypeAndEntityIdAndUserId(EntityType entityType, Long entityId, Long userId);

    int deleteByEntityTypeAndEntityIdAndUserId(EntityType entityType, Long entityId, Long userId);
}
