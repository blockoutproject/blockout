package com.blockout.workernotifications.repositories;

import com.blockout.workernotifications.models.FollowersProjection;
import com.blockout.workernotifications.models.enums.EntityType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FollowersProjectionRepository extends JpaRepository<FollowersProjection, Long> {

    boolean existsByEntityTypeAndEntityIdAndUserId(EntityType entityType, Long entityId, Long userId);

    int deleteByEntityTypeAndEntityIdAndUserId(EntityType entityType, Long entityId, Long userId);
}