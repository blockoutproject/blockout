package com.blockout.users.account.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.users.exceptions.CustomUserNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Executes provider-first account-deletion plans inside the retained local transaction. */
@Service
@RequiredArgsConstructor
public class UserAccountDeletionService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserAccountDeletionService.class);

    private final IdentityProvider identityProvider;
    private final UserAccountStore accounts;
    private final AccountDeletionEventPublisher deletionEvents;

    /** Deletes one identity, records its favorite facts, and then deletes the local account. */
    @Transactional
    public void delete(String auth0Id) {
        UserAccountUpdate update = accounts.findForUpdateByAuth0Id(auth0Id).orElseThrow(() -> {
            LOGGER.warn("Suppression échouée : utilisateur introuvable", keyValue("auth0Id", auth0Id));
            return new CustomUserNotFoundException(auth0Id);
        });

        AccountDeletionPlan plan = AccountDeletionPlan.from(update.current());
        identityProvider.delete(plan.identityId());
        try {
            plan.favoriteDeletions().forEach(favorite -> deletionEvents.publishFavoriteDeleted(
                    plan.accountId(), favorite.entityType(), favorite.entityId()));
            update.delete();
            LOGGER.info("Utilisateur et favoris supprimés", keyValue("auth0Id", auth0Id));
        } catch (RuntimeException exception) {
            LOGGER.error("Erreur lors de la suppression locale de l'utilisateur",
                    keyValue("action", "delete_user_local"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("userId", plan.accountId()), exception);
            throw exception;
        }
    }
}
