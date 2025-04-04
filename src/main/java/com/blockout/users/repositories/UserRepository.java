package com.blockout.users.repositories;

import com.blockout.users.models.CustomUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<CustomUser, Long> {
    /**
     * Trouve un utilisateur par son ID Auth0
     * 
     * @param auth0Id L'identifiant Auth0 de l'utilisateur
     * @return Un Optional contenant l'utilisateur s'il existe
     */
    Optional<CustomUser> findByAuth0Id(String auth0Id);

    /**
     * Trouve un utilisateur par son ID Auth0
     * 
     * @param auth0Id L'identifiant Auth0 de l'utilisateur
     * @return Un Optional contenant l'utilisateur s'il existe, et ses favoris
     */
    @Query("SELECT u FROM CustomUser u LEFT JOIN FETCH u.favorites WHERE u.auth0Id = :auth0Id")
    Optional<CustomUser> findByAuth0IdWithFavorites(@Param("auth0Id") String auth0Id);
}