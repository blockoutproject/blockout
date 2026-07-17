package com.blockout.users.services;

import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.exception.Auth0Exception;
import com.auth0.json.mgmt.users.User;
import com.blockout.users.config.Auth0Properties;
import com.blockout.users.config.Auth0TokenManager;
import com.blockout.users.exceptions.CustomUserEmailAlreadyUsedException;
import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.users.favorite.application.FavoriteEventPublisher;
import com.blockout.users.models.entities.CustomUser;
import com.blockout.users.repositories.UserRepository;
import com.blockout.users.utils.DiffUtils;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/** Retains Auth0 identity, role, linking, and deletion orchestration until MRG-364. */
@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final Auth0TokenManager tokenManager;
    private final UserRepository userRepository;
    private final FavoriteEventPublisher eventPublisher;
    private final Auth0Properties auth0Properties;

    /**
     * Supprime un utilisateur de la base de données et de Auth0.
     *
     * @param auth0Id L'identifiant Auth0 de l'utilisateur à supprimer.
     * @throws CustomUserNotFoundException si l'utilisateur n'existe pas dans la
     *                                     base de données.
     * @throws Auth0Exception              si la suppression de l'utilisateur dans
     *                                     Auth0 échoue.
     */
    @Transactional
    public void deleteUser(String auth0Id) throws Auth0Exception {
        CustomUser user = userRepository.findByAuth0Id(auth0Id)
                .orElseThrow(() -> {
                    logger.warn("Suppression échouée : utilisateur introuvable", keyValue("auth0Id", auth0Id));
                    return new CustomUserNotFoundException(auth0Id);
                });

        try {
            ManagementAPI managementAPI = tokenManager.getManagementAPI();
            managementAPI.users().delete(auth0Id).execute();
        } catch (Auth0Exception e) {
            logger.error("Erreur Auth0 lors de la suppression de l'utilisateur",
                    keyValue("action", "delete_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("userId", user.getId()), e);
            throw e;
        } catch (RuntimeException e) {
            logger.error("Erreur inattendue lors de l'appel à l'API Auth0 pour supprimer l'utilisateur",
                    keyValue("action", "delete_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("userId", user.getId()), e);
            throw e;
        }

        try {
            user.getFavorites().forEach(fav -> {
                try {
                    eventPublisher.publishDeleted(
                            user.getId(),
                            fav.getEntityType(),
                            fav.getEntityId());
                } catch (RuntimeException e) {
                    logger.error("Erreur lors de la publication de l'évènement de suppression de favori",
                            keyValue("action", "delete_user_publish_event"),
                            keyValue("userId", user.getId()),
                            keyValue("entityType", fav.getEntityType()),
                            keyValue("entityId", fav.getEntityId()), e);
                    throw e;
                }
            });

            userRepository.delete(user);

            logger.info("Utilisateur (et ses favoris) supprimé avec succès", keyValue("auth0Id", auth0Id));
        } catch (RuntimeException e) {
            logger.error("Erreur lors de la suppression locale de l'utilisateur",
                    keyValue("action", "delete_user_local"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("userId", user.getId()), e);
            throw e;
        }
    }

    public void assignDefaultRole(String auth0Id) {
        try {
            ManagementAPI managementAPI = tokenManager.getManagementAPI();
            List<String> roleIds = List.of(auth0Properties.getDefaultUserRoleId());
            managementAPI.users().addRoles(auth0Id, roleIds).execute();
            logger.info("Rôle par défaut assigné à l'utilisateur",
                    keyValue("auth0Id", auth0Id),
                    keyValue("roleIds", roleIds));
        } catch (Auth0Exception e) {
            logger.error("Erreur lors de l'assignation du rôle par défaut",
                    keyValue("auth0Id", auth0Id), e);
            throw new RuntimeException("Erreur assignation rôle", e);
        }
    }

    @Transactional
    public CustomUser ensureCurrentUser(String auth0Id) throws Auth0Exception {
        ManagementAPI managementAPI;
        User auth0User;

        logger.info("Ensuring current user exists/updated",
                keyValue("action", "ensure_current_user"),
                keyValue("auth0Id", auth0Id));

        try {
            managementAPI = tokenManager.getManagementAPI();
            auth0User = managementAPI.users().get(auth0Id, null).execute().getBody();
        } catch (Auth0Exception e) {
            logger.error("Erreur lors de la récupération de l'utilisateur Auth0",
                    keyValue("action", "ensure_current_user"),
                    keyValue("auth0Id", auth0Id), e);
            throw e;
        } catch (RuntimeException e) {
            logger.error("Erreur inattendue lors de l'appel à l'API Auth0",
                    keyValue("action", "ensure_current_user"),
                    keyValue("auth0Id", auth0Id), e);
            throw e;
        }

        final ManagementAPI mApi = managementAPI;
        final User currentAuth0User = auth0User;

        return userRepository.findByAuth0Id(auth0Id).map(existing -> {
            // ✅ logique existante inchangée (update depuis Auth0)
            return updateLocalUserIfChanged(existing, currentAuth0User, auth0Id);
        }).orElseGet(() -> {
            // ✅ logique existante inchangée (création) + nouveau linking si conflit email
            return createOrLinkUser(mApi, currentAuth0User, auth0Id);
        });
    }

    /* ====================================================================== */
    /* =========================== Helpers privés =========================== */
    /* ====================================================================== */

    private CustomUser updateLocalUserIfChanged(CustomUser user, User auth0User, String auth0Id) {
        CustomUser before = user.toBuilder().build();
        boolean updated = false;

        if (!Objects.equals(user.getEmail(), auth0User.getEmail())) {
            user.setEmail(auth0User.getEmail());
            updated = true;
        }
        if (!Objects.equals(user.getFirstName(), auth0User.getGivenName())) {
            user.setFirstName(auth0User.getGivenName());
            updated = true;
        }
        if (!Objects.equals(user.getLastName(), auth0User.getFamilyName())) {
            user.setLastName(auth0User.getFamilyName());
            updated = true;
        }
        if (!Objects.equals(user.getPhoneNumber(), auth0User.getPhoneNumber())) {
            user.setPhoneNumber(auth0User.getPhoneNumber());
            updated = true;
        }

        if (!updated)
            return user;

        user.setLastUpdate(Instant.now());
        try {
            CustomUser saved = userRepository.save(user);
            DiffUtils.logChanges(before, saved, logger, "update_user", saved.getId());
            return saved;
        } catch (DataIntegrityViolationException e) {
            logger.error("Violation d'intégrité lors de la mise à jour de l'utilisateur",
                    keyValue("action", "update_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("userId", user.getId()), e);
            throw e;
        } catch (RuntimeException e) {
            logger.error("Erreur inattendue lors de la sauvegarde de l'utilisateur",
                    keyValue("action", "update_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("userId", user.getId()), e);
            throw e;
        }
    }

    private CustomUser createOrLinkUser(ManagementAPI managementAPI, User auth0User, String auth0Id) {
        final String email = auth0User.getEmail();

        // ✅ optimisation : 1 seule requête DB (au lieu de exists + find)
        if (email != null) {
            CustomUser existingByEmail = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (existingByEmail != null) {
                // ✅ nouveau : tenter linking, sinon fallback comportement historique
                CustomUser linked = tryLinkAccountsAndReturnPrimaryLocalUser(
                        managementAPI,
                        existingByEmail,
                        auth0Id,
                        email);
                if (linked != null) {
                    // (optionnel mais cohérent) : resync depuis Auth0 après linking
                    try {
                        User primaryAuth0User = managementAPI.users()
                                .get(linked.getAuth0Id(), null)
                                .execute()
                                .getBody();
                        return updateLocalUserIfChanged(linked, primaryAuth0User, linked.getAuth0Id());
                    } catch (Auth0Exception e) {
                        // Si ça échoue, on renvoie quand même l’utilisateur local primary (linking déjà
                        // fait)
                        logger.error("Linking OK mais échec resync Auth0 (on renvoie le local primary)",
                                keyValue("action", "update_user_after_linking_failed"),
                                keyValue("primaryAuth0Id", linked.getAuth0Id()),
                                keyValue("email", email), e);
                        return linked;
                    }
                }

                logger.error("Échec de la création : email déjà utilisé",
                        keyValue("action", "create_user"),
                        keyValue("auth0Id", auth0Id),
                        keyValue("email", email));
                throw new CustomUserEmailAlreadyUsedException(email);
            }
        }

        // ✅ logique existante inchangée (création)
        CustomUser newUser = CustomUser.builder()
                .auth0Id(auth0User.getId())
                .email(auth0User.getEmail())
                .pseudo(generatePseudo(auth0User.getEmail()))
                .firstName(auth0User.getGivenName())
                .lastName(auth0User.getFamilyName())
                .pictureUrl(auth0User.getPicture())
                .phoneNumber(auth0User.getPhoneNumber())
                .active(true)
                .createdAt(Instant.now())
                .lastUpdate(Instant.now())
                .build();

        try {
            logger.info("DEBUG",
                    keyValue("action", "create_user"),
                    keyValue("auth0Id", newUser.toString()));

            CustomUser created = userRepository.save(newUser);

            logger.info("User created successfully",
                    keyValue("action", "create_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("userId", created.getId()),
                    keyValue("email", created.getEmail()));

            return created;
        } catch (DataIntegrityViolationException e) {
            logger.error("Violation d'intégrité lors de la création de l'utilisateur",
                    keyValue("action", "create_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("email", newUser.getEmail()), e);
            throw e;
        } catch (RuntimeException e) {
            logger.error("Erreur inattendue lors de la création de l'utilisateur",
                    keyValue("action", "create_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("email", newUser.getEmail()), e);
            throw e;
        }
    }

    /**
     * Tente de lier l'identité {secondaryAuth0Id} au compte primary (celui de la
     * BDD),
     * et renvoie le CustomUser primary (local) si succès, sinon null.
     *
     * ⚠️ Remarque: l'appel SDK .link(...) dépend de ta version. Ici je te laisse
     * une méthode dédiée
     * pour centraliser le point à adapter (au lieu d’avoir ça en plein milieu de
     * ensure).
     */
    private CustomUser tryLinkAccountsAndReturnPrimaryLocalUser(
            ManagementAPI managementAPI,
            CustomUser existingByEmail,
            String secondaryAuth0Id,
            String email) {
        try {
            String primaryAuth0Id = existingByEmail.getAuth0Id();

            if (primaryAuth0Id == null)
                return null;

            if (Objects.equals(primaryAuth0Id, secondaryAuth0Id))
                return existingByEmail;

            int pipeIdx = secondaryAuth0Id.indexOf('|');
            if (pipeIdx <= 0) {
                logger.error("Auth0Id invalide, impossible d'extraire le provider",
                        keyValue("action", "link_accounts_parse_failed"),
                        keyValue("secondaryAuth0Id", secondaryAuth0Id),
                        keyValue("email", email));
                return null;
            }

            String provider = secondaryAuth0Id.substring(0, pipeIdx);

            logger.info("Account linking requis (même email, autre provider)",
                    keyValue("action", "link_accounts"),
                    keyValue("email", email),
                    keyValue("primaryAuth0Id", primaryAuth0Id),
                    keyValue("secondaryAuth0Id", secondaryAuth0Id),
                    keyValue("provider", provider));

            // ✅ APPEL OFFICIEL ET CORRECT DU SDK AUTH0
            managementAPI.users()
                    .linkIdentity(
                            primaryAuth0Id,
                            secondaryAuth0Id,
                            provider,
                            null)
                    .execute();

            return existingByEmail;

        } catch (Auth0Exception e) {
            logger.error("Échec du linking Auth0 (fallback sur erreur email déjà utilisé)",
                    keyValue("action", "link_accounts_failed"),
                    keyValue("email", email),
                    keyValue("secondaryAuth0Id", secondaryAuth0Id), e);
            return null;
        } catch (RuntimeException e) {
            logger.error("Erreur inattendue pendant le linking (fallback sur erreur email déjà utilisé)",
                    keyValue("action", "link_accounts_failed_unexpected"),
                    keyValue("email", email),
                    keyValue("secondaryAuth0Id", secondaryAuth0Id), e);
            return null;
        }
    }

    private String generatePseudo(String email) {
        // Base lisible
        String base = (email != null && email.contains("@"))
                ? email.substring(0, email.indexOf("@"))
                : "user";

        base = normalizePseudo(base);

        // 1) si libre -> go
        if (!userRepository.existsByPseudoIgnoreCase(base)) {
            return base;
        }

        // 2) sinon, on tente base-2, base-3, ...
        for (int i = 2; i <= 200; i++) {
            String candidate = base + "-" + i;
            if (!userRepository.existsByPseudoIgnoreCase(candidate)) {
                return candidate;
            }
        }

        // 3) fallback anti-collision
        return base + "-" + Long.toString(System.nanoTime(), 36);
    }

    private String normalizePseudo(String raw) {
        if (raw == null || raw.isBlank())
            return "user";

        // slug simple (tu peux faire plus strict si besoin)
        String s = raw.trim().toLowerCase()
                .replaceAll("\\s+", "-")
                .replaceAll("[^a-z0-9._-]", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("(^-+)|(-+$)", "");

        if (s.isBlank())
            s = "user";
        if (s.length() > 30)
            s = s.substring(0, 30).replaceAll("(-+$)", "");
        return s;
    }
}
