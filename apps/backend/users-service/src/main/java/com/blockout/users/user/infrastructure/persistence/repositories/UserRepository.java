package com.blockout.users.user.infrastructure.persistence.repositories;

import com.blockout.users.user.infrastructure.persistence.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByAuth0Id(String auth0Id);

    @Query("SELECT user FROM UserEntity user LEFT JOIN FETCH user.favorites WHERE user.auth0Id = :auth0Id")
    Optional<UserEntity> findByAuth0IdWithFavorites(@Param("auth0Id") String auth0Id);

    boolean existsByPseudoIgnoreCaseAndIdNot(String pseudo, Long id);

    Optional<UserEntity> findByEmailIgnoreCase(String email);

    boolean existsByPseudoIgnoreCase(String pseudo);
}
