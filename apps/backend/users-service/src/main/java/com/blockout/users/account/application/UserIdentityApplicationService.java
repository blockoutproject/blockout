package com.blockout.users.account.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.users.exceptions.CustomUserEmailAlreadyUsedException;
import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.users.favorite.application.FavoriteEventPublisher;
import com.blockout.users.models.entities.CustomUser;
import com.blockout.users.repositories.UserRepository;
import com.blockout.users.utils.DiffUtils;
import java.time.Instant;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Orchestrates local account identity workflows behind an explicit provider port. */
@Service
@RequiredArgsConstructor
public class UserIdentityApplicationService implements UserIdentityService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserIdentityApplicationService.class);

    private final IdentityProvider identityProvider;
    private final UserRepository users;
    private final UserAccountViewMapper mapper;
    private final FavoriteEventPublisher favoriteEvents;

    /** {@inheritDoc} */
    @Override
    @Transactional
    public UserAccountView ensureCurrent(String auth0Id) {
        LOGGER.info("Ensuring current user exists or is synchronized",
                keyValue("action", "ensure_current_user"), keyValue("auth0Id", auth0Id));
        IdentityProfile identity = identityProvider.get(auth0Id);
        CustomUser account = users.findByAuth0Id(auth0Id)
                .map(existing -> synchronize(existing, identity, auth0Id))
                .orElseGet(() -> createOrLink(identity, auth0Id));
        return mapper.toView(account);
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public void deleteCurrent(String auth0Id) {
        CustomUser user = users.findByAuth0Id(auth0Id).orElseThrow(() -> {
            LOGGER.warn("Suppression échouée : utilisateur introuvable", keyValue("auth0Id", auth0Id));
            return new CustomUserNotFoundException(auth0Id);
        });

        identityProvider.delete(auth0Id);
        try {
            user.getFavorites().forEach(favorite -> favoriteEvents.publishDeleted(
                    user.getId(), favorite.getEntityType(), favorite.getEntityId()));
            users.delete(user);
            LOGGER.info("Utilisateur et favoris supprimés", keyValue("auth0Id", auth0Id));
        } catch (RuntimeException exception) {
            LOGGER.error("Erreur lors de la suppression locale de l'utilisateur",
                    keyValue("action", "delete_user_local"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("userId", user.getId()), exception);
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
    private CustomUser synchronize(CustomUser user, IdentityProfile identity, String auth0Id) {
        CustomUser before = user.toBuilder().build();
        boolean changed = false;
        if (!Objects.equals(user.getEmail(), identity.email())) {
            user.setEmail(identity.email());
            changed = true;
        }
        if (!Objects.equals(user.getFirstName(), identity.firstName())) {
            user.setFirstName(identity.firstName());
            changed = true;
        }
        if (!Objects.equals(user.getLastName(), identity.lastName())) {
            user.setLastName(identity.lastName());
            changed = true;
        }
        if (!Objects.equals(user.getPhoneNumber(), identity.phoneNumber())) {
            user.setPhoneNumber(identity.phoneNumber());
            changed = true;
        }
        if (!changed) {
            return user;
        }

        user.setLastUpdate(Instant.now());
        try {
            CustomUser saved = users.save(user);
            DiffUtils.logChanges(before, saved, LOGGER, "update_user", saved.getId());
            return saved;
        } catch (DataIntegrityViolationException exception) {
            LOGGER.error("Violation d'intégrité lors de la mise à jour de l'utilisateur",
                    keyValue("action", "update_user"), keyValue("auth0Id", auth0Id),
                    keyValue("userId", user.getId()), exception);
            throw exception;
        }
    }

    /** Creates a new local user or preserves the existing same-email linking workflow. */
    private CustomUser createOrLink(IdentityProfile identity, String requestedAuth0Id) {
        if (identity.email() != null) {
            CustomUser existing = users.findByEmailIgnoreCase(identity.email()).orElse(null);
            if (existing != null) {
                if (identityProvider.link(existing.getAuth0Id(), requestedAuth0Id)) {
                    try {
                        IdentityProfile primary = identityProvider.get(existing.getAuth0Id());
                        return synchronize(existing, primary, existing.getAuth0Id());
                    } catch (UserIdentityProviderException exception) {
                        LOGGER.error("Linking réussi mais resynchronisation Auth0 impossible",
                                keyValue("action", "update_user_after_linking_failed"),
                                keyValue("primaryAuth0Id", existing.getAuth0Id()), exception);
                        return existing;
                    }
                }
                LOGGER.error("Échec de la création : email déjà utilisé",
                        keyValue("action", "create_user"),
                        keyValue("auth0Id", requestedAuth0Id),
                        keyValue("email", identity.email()));
                throw new CustomUserEmailAlreadyUsedException(identity.email());
            }
        }

        CustomUser created = CustomUser.builder()
                .auth0Id(identity.id())
                .email(identity.email())
                .pseudo(generatePseudo(identity.email()))
                .firstName(identity.firstName())
                .lastName(identity.lastName())
                .pictureUrl(identity.pictureUrl())
                .phoneNumber(identity.phoneNumber())
                .active(true)
                .createdAt(Instant.now())
                .lastUpdate(Instant.now())
                .build();
        try {
            CustomUser saved = users.save(created);
            LOGGER.info("User created successfully", keyValue("action", "create_user"),
                    keyValue("auth0Id", requestedAuth0Id), keyValue("userId", saved.getId()));
            return saved;
        } catch (DataIntegrityViolationException exception) {
            LOGGER.error("Violation d'intégrité lors de la création de l'utilisateur",
                    keyValue("action", "create_user"), keyValue("auth0Id", requestedAuth0Id), exception);
            throw exception;
        }
    }

    /** Preserves the existing normalized email-prefix pseudo and collision sequence. */
    private String generatePseudo(String email) {
        String base = email != null && email.contains("@") ? email.substring(0, email.indexOf('@')) : "user";
        base = normalizePseudo(base);
        if (!users.existsByPseudoIgnoreCase(base)) {
            return base;
        }
        for (int suffix = 2; suffix <= 200; suffix++) {
            String candidate = base + "-" + suffix;
            if (!users.existsByPseudoIgnoreCase(candidate)) {
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
