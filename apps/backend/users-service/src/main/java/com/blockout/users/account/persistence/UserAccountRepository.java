package com.blockout.users.account.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Spring Data owner of the existing users table mapping. */
@Repository
public interface UserAccountRepository extends JpaRepository<UserAccountEntity, Long> {

    Optional<UserAccountEntity> findByAuth0Id(String auth0Id);

    @Query("SELECT u FROM CustomUser u LEFT JOIN FETCH u.favorites WHERE u.auth0Id = :auth0Id")
    Optional<UserAccountEntity> findByAuth0IdWithFavorites(@Param("auth0Id") String auth0Id);

    boolean existsByPseudoIgnoreCaseAndIdNot(String pseudo, Long id);

    Optional<UserAccountEntity> findByEmailIgnoreCase(String email);

    boolean existsByPseudoIgnoreCase(String pseudo);
}
