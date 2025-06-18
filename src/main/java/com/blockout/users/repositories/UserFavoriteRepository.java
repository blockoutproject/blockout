package com.blockout.users.repositories;

import com.blockout.users.models.UserFavorite;
import com.blockout.users.models.enums.EntityType;
import com.blockout.users.models.CustomUser;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Long> {

    // Tous les favoris d'un user
    List<UserFavorite> findByUser(CustomUser user);

    // Tous les favoris d'un user pour un type donné (TEAM, POOL, etc.)
    List<UserFavorite> findByUserAndEntityType(CustomUser user, EntityType entityType);

    // Vérifier s'il existe déjà un favori
    Optional<UserFavorite> findByUserAndEntityTypeAndEntityId(CustomUser user, EntityType entityType, Long entityId);
}