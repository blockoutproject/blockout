package com.blockout.users.repositories;

import com.blockout.users.models.entities.CustomUser;
import com.blockout.users.models.entities.UserFavorite;
import com.blockout.users.models.enums.EntityType;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Long> {

    boolean existsByUserAndEntityTypeAndEntityId(CustomUser user, EntityType type, Long entityId);

    int deleteByUserAndEntityTypeAndEntityId(CustomUser user, EntityType type, Long entityId);

    List<UserFavorite> findByUserId(Long userId);

    List<UserFavorite> findByUserIdAndEntityType(Long userId, EntityType entityType);

    Page<UserFavorite> findByUserId(Long userId, Pageable pageable);

    Page<UserFavorite> findByUserIdAndEntityType(Long userId, EntityType entityType, Pageable pageable);
}
