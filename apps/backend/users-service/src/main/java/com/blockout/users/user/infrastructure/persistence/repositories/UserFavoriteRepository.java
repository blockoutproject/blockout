package com.blockout.users.user.infrastructure.persistence.repositories;

import com.blockout.users.user.application.models.EntityType;
import com.blockout.users.user.infrastructure.persistence.entities.UserEntity;
import com.blockout.users.user.infrastructure.persistence.entities.UserFavoriteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserFavoriteRepository extends JpaRepository<UserFavoriteEntity, Long> {

    boolean existsByUserAndEntityTypeAndEntityId(UserEntity user, EntityType type, Long entityId);

    int deleteByUserAndEntityTypeAndEntityId(UserEntity user, EntityType type, Long entityId);

    List<UserFavoriteEntity> findByUserId(Long userId);

    List<UserFavoriteEntity> findByUserIdAndEntityType(Long userId, EntityType entityType);
}
