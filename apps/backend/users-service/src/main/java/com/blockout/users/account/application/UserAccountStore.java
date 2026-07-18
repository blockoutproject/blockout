package com.blockout.users.account.application;

import java.util.Optional;

/** Owns local account persistence operations required by account and identity use cases. */
public interface UserAccountStore {

    /** Reads one complete account projection for transport-facing queries. */
    Optional<UserAccountView> findByAuth0Id(String auth0Id);

    /** Opens one transaction-bound account handle selected by external identity. */
    Optional<UserAccountUpdate> findForUpdateByAuth0Id(String auth0Id);

    /** Opens one transaction-bound account handle selected by normalized email. */
    Optional<UserAccountUpdate> findForUpdateByEmail(String email);

    /** Checks pseudo uniqueness while excluding the account being updated. */
    boolean existsByPseudoIgnoringCaseExcept(String pseudo, Long accountId);

    /** Checks pseudo uniqueness for generated account names. */
    boolean existsByPseudoIgnoringCase(String pseudo);

    /** Persists one new local account and returns its complete projection. */
    UserAccountView create(NewUserAccount account);
}
