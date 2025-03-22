package com.blockout.users.repositories;

import com.blockout.users.models.CustomUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<CustomUser, Long> {
    /**
     * Trouve un utilisateur par son ID Auth0
     * @param auth0Id L'identifiant Auth0 de l'utilisateur
     * @return Un Optional contenant l'utilisateur s'il existe
     */
    Optional<CustomUser> findByAuth0Id(String auth0Id);
}