package com.blockout.users.account.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.users.exceptions.CustomUserEmailAlreadyUsedException;
import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.users.favorite.application.FavoriteEventPublisher;
import com.blockout.users.utils.DiffUtils;
import java.time.Instant;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Orchestrates local account identity workflows behind an explicit provider port. */
@Service
@RequiredArgsConstructor
public class UserIdentityApplicationService implements UserIdentityService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserIdentityApplicationService.class);

    private final IdentityProvider identityProvider;
    private final UserAccountStore accounts;
    private final FavoriteEventPublisher favoriteEvents;

    /** {@inheritDoc} */
    @Override
    @Transactional
    public UserAccountView ensureCurrent(String auth0Id) {
        LOGGER.info("Ensuring current user exists or is synchronized",
                keyValue("action", "ensure_current_user"), keyValue("auth0Id", auth0Id));
        IdentityProfile identity = identityProvider.get(auth0Id);
        UserAccountView account = accounts.findForUpdateByAuth0Id(auth0Id)
                .map(existing -> synchronize(existing, identity, auth0Id))
                .orElseGet(() -> createOrLink(identity, auth0Id));
        return account;
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public void deleteCurrent(String auth0Id) {
        UserAccountUpdate update = accounts.findForUpdateByAuth0Id(auth0Id).orElseThrow(() -> {
            LOGGER.warn("Suppression échouée : utilisateur introuvable", keyValue("auth0Id", auth0Id));
            return new CustomUserNotFoundException(auth0Id);
        });

        UserAccountView user = update.current();
        identityProvider.delete(auth0Id);
        try {
            user.favorites().forEach(favorite -> favoriteEvents.publishDeleted(
                    user.id(), favorite.entityType(), favorite.entityId()));
            update.delete();
            LOGGER.info("Utilisateur et favoris supprimés", keyValue("auth0Id", auth0Id));
        } catch (RuntimeException exception) {
            LOGGER.error("Erreur lors de la suppression locale de l'utilisateur",
                    keyValue("action", "delete_user_local"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("userId", user.id()), exception);
            throw exception;
        }
    }

    /** {@inheritDoc} */
    @Override
    public void assignDefaultRole(String auth0Id) {
        try {
            identityProvider.assignDefaultRole(auth0Id);
            LOGGER.info("Rôle par défaut assigné à l'utilisateur", keyValue("auth0Id", auth0Id));
        } catch (UserIdentityProviderException exception) {
            throw new DefaultRoleAssignmentException(exception);
        }
    }

    /** Synchronizes only the external profile fields historically refreshed by ensure. */
    private UserAccountView synchronize(UserAccountUpdate update, IdentityProfile identity, String auth0Id) {
        UserAccountView user = update.current();
        boolean changed = !Objects.equals(user.email(), identity.email())
                || !Objects.equals(user.firstName(), identity.firstName())
                || !Objects.equals(user.lastName(), identity.lastName())
                || !Objects.equals(user.phoneNumber(), identity.phoneNumber());
        if (!changed) {
            return user;
        }

        try {
            UserAccountChange saved = update.synchronize(new UserIdentitySynchronization(
                    identity.email(),
                    identity.firstName(),
                    identity.lastName(),
                    identity.phoneNumber(),
                    Instant.now()));
            DiffUtils.logChanges(saved.before(), saved.after(), LOGGER, "update_user", saved.after().id());
            return saved.after();
        } catch (UserAccountPersistenceException exception) {
            LOGGER.error("Violation d'intégrité lors de la mise à jour de l'utilisateur",
                    keyValue("action", "update_user"), keyValue("auth0Id", auth0Id),
                    keyValue("userId", user.id()), exception);
            throw exception;
        }
    }

    /** Creates a new local user or preserves the existing same-email linking workflow. */
    private UserAccountView createOrLink(IdentityProfile identity, String requestedAuth0Id) {
        if (identity.email() != null) {
            UserAccountUpdate existing = accounts.findForUpdateByEmail(identity.email()).orElse(null);
            if (existing != null) {
                UserAccountView current = existing.current();
                if (identityProvider.link(current.auth0Id(), requestedAuth0Id)) {
                    try {
                        IdentityProfile primary = identityProvider.get(current.auth0Id());
                        return synchronize(existing, primary, current.auth0Id());
                    } catch (UserIdentityProviderException exception) {
                        LOGGER.error("Linking réussi mais resynchronisation Auth0 impossible",
                                keyValue("action", "update_user_after_linking_failed"),
                                keyValue("primaryAuth0Id", current.auth0Id()), exception);
                        return current;
                    }
                }
                LOGGER.error("Échec de la création : email déjà utilisé",
                        keyValue("action", "create_user"),
                        keyValue("auth0Id", requestedAuth0Id),
                        keyValue("email", identity.email()));
                throw new CustomUserEmailAlreadyUsedException(identity.email());
            }
        }

        Instant now = Instant.now();
        NewUserAccount created = new NewUserAccount(
                identity.id(),
                identity.email(),
                generatePseudo(identity.email()),
                identity.firstName(),
                identity.lastName(),
                identity.pictureUrl(),
                identity.phoneNumber(),
                true,
                now,
                now);
        try {
            UserAccountView saved = accounts.create(created);
            LOGGER.info("User created successfully", keyValue("action", "create_user"),
                    keyValue("auth0Id", requestedAuth0Id), keyValue("userId", saved.id()));
            return saved;
        } catch (UserAccountPersistenceException exception) {
            LOGGER.error("Violation d'intégrité lors de la création de l'utilisateur",
                    keyValue("action", "create_user"), keyValue("auth0Id", requestedAuth0Id), exception);
            throw exception;
        }
    }

    /** Preserves the existing normalized email-prefix pseudo and collision sequence. */
    private String generatePseudo(String email) {
        String base = email != null && email.contains("@") ? email.substring(0, email.indexOf('@')) : "user";
        base = normalizePseudo(base);
        if (!accounts.existsByPseudoIgnoringCase(base)) {
            return base;
        }
        for (int suffix = 2; suffix <= 200; suffix++) {
            String candidate = base + "-" + suffix;
            if (!accounts.existsByPseudoIgnoringCase(candidate)) {
                return candidate;
            }
        }
        return base + "-" + Long.toString(System.nanoTime(), 36);
    }

    /** Applies the retained lowercase ASCII slug normalization and 30-character bound. */
    private String normalizePseudo(String raw) {
        if (raw == null || raw.isBlank()) {
            return "user";
        }
        String normalized = raw.trim().toLowerCase()
                .replaceAll("\\s+", "-")
                .replaceAll("[^a-z0-9._-]", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("(^-+)|(-+$)", "");
        if (normalized.isBlank()) {
            normalized = "user";
        }
        if (normalized.length() > 30) {
            normalized = normalized.substring(0, 30).replaceAll("(-+$)", "");
        }
        return normalized;
    }
}
