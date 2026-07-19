package com.blockout.notifications.notification.infrastructure.persistence.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.blockout.notifications.notification.application.models.EntityType;
import com.blockout.notifications.notification.infrastructure.persistence.entities.FollowersProjectionEntity;

@Repository
public interface FollowersProjectionRepository extends JpaRepository<FollowersProjectionEntity, Long> {

    boolean existsByEntityTypeAndEntityIdAndUserId(EntityType entityType, Long entityId, Long userId);

    int deleteByEntityTypeAndEntityIdAndUserId(EntityType entityType, Long entityId, Long userId);
}
