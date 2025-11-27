package com.blockout.users.repositories;

import com.blockout.users.models.entities.CustomUser;
import com.blockout.users.models.entities.UserFavorite;
import com.blockout.users.models.enums.EntityType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Long> {

    boolean existsByUserAndEntityTypeAndEntityId(CustomUser user, EntityType type, Long entityId);

    int deleteByUserAndEntityTypeAndEntityId(CustomUser user, EntityType type, Long entityId);

    List<UserFavorite> findByUserId(Long userId);

    List<UserFavorite> findByUserIdAndEntityType(Long userId, EntityType entityType);
}