package com.blockout.users.services;

import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.exception.Auth0Exception;
import com.auth0.json.mgmt.users.User;
import com.blockout.users.config.Auth0Properties;
import com.blockout.users.config.Auth0TokenManager;
import com.blockout.users.exceptions.ConflictException;
import com.blockout.users.exceptions.CustomUserEmailAlreadyUsedException;
import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.users.models.dto.CustomUserDTO;
import com.blockout.users.models.dto.CustomUserUpdateDTO;
import com.blockout.users.models.entities.CustomUser;
import com.blockout.users.models.enums.EventType;
import com.blockout.users.models.mappers.CustomUserMapper;
import com.blockout.users.repositories.UserRepository;
import com.blockout.users.services.clients.S3StorageClientService;
import com.blockout.users.utils.DiffUtils;
import com.blockout.users.utils.ImageUtils;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final Auth0TokenManager tokenManager;
    private final UserRepository userRepository;
    private final CustomUserMapper customUserMapper;
    private final EventPublisher eventPublisher;
    private final Auth0Properties auth0Properties;
    private final S3StorageClientService s3StorageClient;

    /**
     * Récupère un utilisateur par son ID Auth0.
     *
     * @param auth0Id L'identifiant Auth0
     * @return L'utilisateur mappé en DTO
     * @throws CustomUserNotFoundException si aucun utilisateur n'est trouvé
     */
    public CustomUserDTO getUserByAuth0Id(String auth0Id) {
        return userRepository.findByAuth0IdWithFavorites(auth0Id)
                .map(customUserMapper::toDto)
                .orElseThrow(() -> {
                    logger.warn("Utilisateur introuvable", keyValue("auth0Id", auth0Id));
                    return new CustomUserNotFoundException(auth0Id);
                });
    }

    /**
     * Crée ou met à jour un utilisateur à partir de son ID Auth0 (sub),
     * en récupérant les informations directement depuis l'API Management Auth0.
     * Si l'utilisateur existe déjà et qu'aucune donnée n'a changé, aucun
     * enregistrement n'est effectué.
     * En cas de création, un rôle par défaut est automatiquement assigné via Auth0.
     *
     * @param auth0Id Identifiant unique Auth0 (claim "sub")
     * @return L'utilisateur existant ou nouvellement créé
     * @throws Auth0Exception En cas d'échec de récupération ou d'assignation de
     *                        rôle depuis Auth0
     */
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

        return userRepository.findByAuth0Id(auth0Id).map(user -> {
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
        }).orElseGet(() -> {
            final String email = auth0User.getEmail();

            if (email != null && userRepository.existsByEmailIgnoreCase(email)) {
                logger.warn("Échec de la création : email déjà utilisé",
                        keyValue("action", "create_user"),
                        keyValue("auth0Id", auth0Id),
                        keyValue("email", email));
                throw new CustomUserEmailAlreadyUsedException(email);
            }

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
        });
    }

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
                    eventPublisher.publishFollowEvent(
                            user.getId(),
                            fav.getEntityType(),
                            fav.getEntityId(),
                            EventType.DELETED);
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

    /**
     * Met à jour un utilisateur existant.
     * Seuls les champs non nuls dans dto sont modifiés.
     * Si un fichier image est fourni, l'ancienne image est supprimée et remplacée.
     * Vérifie l'unicité du pseudo avant sauvegarde.
     *
     * @param auth0Id L'identifiant Auth0 de l'utilisateur à mettre à jour
     * @param dto     Les nouvelles données de l'utilisateur (pseudo, prénom, nom)
     * @param image   La nouvelle photo de profil (optionnelle)
     * @return L'utilisateur mis à jour
     * @throws CustomUserNotFoundException si aucun utilisateur n'est trouvé avec
     *                                     cet identifiant
     * @throws ConflictException           si le pseudo demandé est déjà utilisé par
     *                                     un autre utilisateur
     * @throws RuntimeException            en cas d'échec lors de l'upload de
     *                                     l'image
     */
    @Transactional
    public CustomUser updateUser(String auth0Id, CustomUserUpdateDTO dto, MultipartFile image) {
        return userRepository.findByAuth0Id(auth0Id).map(existing -> {
            CustomUser before = existing.toBuilder().build();

            if (dto.getPseudo() != null) {
                String requested = dto.getPseudo().trim();
                if (!requested.isEmpty() && !Objects.equals(requested, existing.getPseudo())) {
                    boolean taken = userRepository.existsByPseudoIgnoreCaseAndIdNot(requested, existing.getId());
                    if (taken) {
                        logger.warn("Pseudo déjà utilisé",
                                keyValue("action", "update_user"),
                                keyValue("auth0Id", auth0Id),
                                keyValue("requestedPseudo", requested));
                        throw new ConflictException("Ce pseudo est déjà utilisé.");
                    }
                    existing.setPseudo(requested);
                }
            }

            if (image != null && !image.isEmpty()) {
                ImageUtils.validateImage(image);
                try {
                    if (existing.getPictureUrl() != null) {
                        s3StorageClient.deleteObjectByUrl(existing.getPictureUrl());
                    }

                    String logoUrl = s3StorageClient.uploadProfileImage(image, "users");
                    existing.setPictureUrl(logoUrl);
                } catch (IOException e) {
                    logger.error("Erreur lors de l'upload de l'image",
                            keyValue("fileName", image.getOriginalFilename()), e);
                    throw new RuntimeException("Échec de l’upload de l’image");
                }
            } else {
                if (dto.getPictureUrl() == null) {
                    if (existing.getPictureUrl() != null) {
                        s3StorageClient.deleteObjectByUrl(existing.getPictureUrl());
                    }
                    existing.setPictureUrl(null);
                }
            }

            if (!existing.getActive()) {
                existing.setActive(true);
                logger.info("Utilisateur réactivé",
                        keyValue("action", "reactivate_user"),
                        keyValue("auth0Id", auth0Id),
                        keyValue("userId", existing.getId()));
            }

            try {
                CustomUser updated = userRepository.save(existing);
                DiffUtils.logChanges(before, updated, logger, "update_user", updated.getId());
                return updated;
            } catch (DataIntegrityViolationException dive) {
                logger.error(
                        "Violation d'intégrité lors de la mise à jour de l'utilisateur (pseudo probablement en double)",
                        keyValue("action", "update_user"),
                        keyValue("auth0Id", auth0Id),
                        keyValue("requestedPseudo", dto.getPseudo()), dive);
                throw new ConflictException("Ce pseudo est déjà utilisé.");
            }
        }).orElseThrow(() -> {
            logger.error("User not found. Cannot update.",
                    keyValue("action", "update_user"),
                    keyValue("auth0Id", auth0Id));
            return new CustomUserNotFoundException(auth0Id);
        });
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