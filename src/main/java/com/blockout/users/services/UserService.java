package com.blockout.users.services;

import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.exception.Auth0Exception;
import com.auth0.json.mgmt.users.User;
import com.blockout.users.config.Auth0Properties;
import com.blockout.users.config.Auth0TokenManager;
import com.blockout.users.exceptions.ConflictException;
import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.users.models.CustomUser;
import com.blockout.users.models.dto.CustomUserDto;
import com.blockout.users.models.dto.CustomUserUpdateDTO;
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
import java.time.LocalDateTime;
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

    private String generatePseudo(String email) {
        return (email != null) ? email.split("@")[0] : "user" + System.currentTimeMillis();
    }

    /**
     * Récupère un utilisateur par son ID Auth0.
     *
     * @param auth0Id L'identifiant Auth0
     * @return L'utilisateur mappé en DTO
     * @throws CustomUserNotFoundException si aucun utilisateur n'est trouvé
     */
    public CustomUserDto getUserByAuth0Id(String auth0Id) {
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
     * @throws Auth0Exception En cas d'échec de récupération ou d'assignation de rôle depuis Auth0
     */
    @Transactional
    public CustomUser ensureCurrentUser(String auth0Id) throws Auth0Exception {
        ManagementAPI managementAPI = tokenManager.getManagementAPI();
        User auth0User = managementAPI.users().get(auth0Id, null).execute().getBody();

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

            user.setLastUpdate(LocalDateTime.now());
            CustomUser saved = userRepository.save(user);
            DiffUtils.logChanges(before, saved, logger, "update_user", saved.getId());

            return saved;
        }).orElseGet(() -> {
            CustomUser newUser = CustomUser.builder()
                    .auth0Id(auth0User.getId())
                    .email(auth0User.getEmail())
                    .pseudo(generatePseudo(auth0User.getEmail()))
                    .firstName(auth0User.getGivenName())
                    .lastName(auth0User.getFamilyName())
                    .pictureUrl(auth0User.getPicture())
                    .phoneNumber(auth0User.getPhoneNumber())
                    .active(true)
                    .createdAt(LocalDateTime.now())
                    .lastUpdate(LocalDateTime.now())
                    .build();

            CustomUser created = userRepository.save(newUser);

            logger.info("User created successfully",
                    keyValue("action", "create_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("userId", created.getId()),
                    keyValue("email", created.getEmail()));

            return created;
        });
    }

    /**
     * Supprime un utilisateur de la base de données et de Auth0.
     *
     * @param auth0Id L'identifiant Auth0 de l'utilisateur à supprimer.
     * @throws CustomUserNotFoundException si l'utilisateur n'existe pas dans la base de données.
     * @throws Auth0Exception si la suppression de l'utilisateur dans Auth0 échoue.
     */
    @Transactional
    public void deleteUser(String auth0Id) throws Auth0Exception {
        CustomUser user = userRepository.findByAuth0Id(auth0Id)
                .orElseThrow(() -> {
                    logger.warn("Suppression échouée : utilisateur introuvable", keyValue("auth0Id", auth0Id));
                    return new CustomUserNotFoundException(auth0Id);
                });

        ManagementAPI managementAPI = tokenManager.getManagementAPI();
        managementAPI.users().delete(auth0Id).execute();

        user.getFavorites().forEach(fav -> eventPublisher.publishFollowEvent(
                user.getId(),
                fav.getEntityType(),
                fav.getEntityId(),
                EventType.DELETED));

        userRepository.delete(user);

        logger.info("Utilisateur (et ses favoris) supprimé avec succès", keyValue("auth0Id", auth0Id));
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
     * @param dto Les nouvelles données de l'utilisateur (pseudo, prénom, nom)
     * @param image La nouvelle photo de profil (optionnelle)
     * @return L'utilisateur mis à jour
     * @throws CustomUserNotFoundException si aucun utilisateur n'est trouvé avec cet identifiant
     * @throws ConflictException si le pseudo demandé est déjà utilisé par un autre utilisateur
     * @throws RuntimeException en cas d'échec lors de l'upload de l'image
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

            if (dto.getFirstName() != null && !Objects.equals(dto.getFirstName(), existing.getFirstName()))
                existing.setFirstName(dto.getFirstName());
            if (dto.getLastName() != null && !Objects.equals(dto.getLastName(), existing.getLastName()))
                existing.setLastName(dto.getLastName());

            if (image != null && !image.isEmpty()) {
                ImageUtils.validateImage(image);
                try {
                    if (existing.getPictureUrl() != null) {
                        s3StorageClient.deleteObjectByUrl(existing.getPictureUrl());
                    }
                    String url = s3StorageClient.uploadProfileImage(image, "users");
                    existing.setPictureUrl(url);
                } catch (IOException e) {
                    logger.error("Erreur lors de l'upload de l'image",
                            keyValue("fileName", image.getOriginalFilename()), e);
                    throw new RuntimeException("Échec de l’upload de l’image");
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
                // Filet de sécurité si la contrainte UNIQUE (DB) remonte
                throw new ConflictException("Ce pseudo est déjà utilisé.");
            }

        }).orElseThrow(() -> {
            logger.error("User not found. Cannot update.",
                    keyValue("action", "update_user"),
                    keyValue("auth0Id", auth0Id));
            return new CustomUserNotFoundException(auth0Id);
        });
    }
}