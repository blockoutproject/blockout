package com.blockout.users.user.application;

import com.blockout.users.user.application.commands.UpdateUserCommand;
import com.blockout.users.user.application.commands.UserImageCommand;
import com.blockout.users.user.application.exceptions.UserConflictException;
import com.blockout.users.user.application.exceptions.UserEmailAlreadyUsedException;
import com.blockout.users.user.application.exceptions.UserNotFoundException;
import com.blockout.users.user.application.models.ExternalUserProfile;
import com.blockout.users.user.application.models.FollowEventType;
import com.blockout.users.user.application.ports.UserFollowPublisher;
import com.blockout.users.user.application.ports.UserIdentityProvider;
import com.blockout.users.user.application.ports.UserImageStorage;
import com.blockout.users.user.application.views.UserFavoriteSummaryView;
import com.blockout.users.user.application.views.UserView;
import com.blockout.users.user.infrastructure.persistence.entities.UserEntity;
import com.blockout.users.user.infrastructure.persistence.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class UserApplicationService implements UserService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserApplicationService.class);
    private static final long MAX_IMAGE_SIZE = 5L * 1024L * 1024L;

    private final UserRepository userRepository;
    private final UserIdentityProvider identityProvider;
    private final UserImageStorage imageStorage;
    private final UserFollowPublisher followPublisher;

    @Override
    @Transactional(readOnly = true)
    public UserView getUserByAuth0Id(String auth0Id) {
        return userRepository.findByAuth0IdWithFavorites(auth0Id)
                .map(this::toView)
                .orElseThrow(() -> new UserNotFoundException(auth0Id));
    }

    @Override
    @Transactional
    public UserView updateUser(String auth0Id, UpdateUserCommand command) {
        UserEntity user = userRepository.findByAuth0Id(auth0Id)
                .orElseThrow(() -> new UserNotFoundException(auth0Id));
        updatePseudo(user, command.pseudo());
        updatePicture(user, command);
        if (!Boolean.TRUE.equals(user.getActive())) user.setActive(true);

        try {
            UserView updated = toView(userRepository.saveAndFlush(user));
            LOGGER.info("Updated user", keyValue("action", "update_user"), keyValue("userId", updated.id()));
            return updated;
        } catch (DataIntegrityViolationException exception) {
            throw new UserConflictException("Ce pseudo est déjà utilisé.");
        }
    }

    @Override
    @Transactional
    public UserView ensureCurrentUser(String auth0Id) {
        ExternalUserProfile externalUser = identityProvider.getUser(auth0Id);
        UserEntity user = userRepository.findByAuth0Id(auth0Id)
                .map(existing -> synchronize(existing, externalUser))
                .orElseGet(() -> createOrLinkUser(externalUser, auth0Id));
        return toView(user);
    }

    @Override
    @Transactional
    public void deleteUser(String auth0Id) {
        UserEntity user = userRepository.findByAuth0Id(auth0Id)
                .orElseThrow(() -> new UserNotFoundException(auth0Id));
        identityProvider.deleteUser(auth0Id);
        if (user.getFavorites() != null) {
            user.getFavorites().forEach(favorite -> followPublisher.publish(
                    user.getId(), favorite.getEntityType(), favorite.getEntityId(), FollowEventType.DELETED));
        }
        userRepository.delete(user);
        LOGGER.info("Deleted user", keyValue("action", "delete_user"), keyValue("userId", user.getId()));
    }

    @Override
    public void assignDefaultRole(String auth0Id) {
        identityProvider.assignDefaultRole(auth0Id);
        LOGGER.info("Assigned default user role", keyValue("action", "assign_default_role"),
                keyValue("auth0Id", auth0Id));
    }

    private void updatePseudo(UserEntity user, String pseudo) {
        if (pseudo == null) return;
        String requested = pseudo.trim();
        if (requested.isEmpty() || Objects.equals(requested, user.getPseudo())) return;
        if (userRepository.existsByPseudoIgnoreCaseAndIdNot(requested, user.getId())) {
            throw new UserConflictException("Ce pseudo est déjà utilisé.");
        }
        user.setPseudo(requested);
    }

    private void updatePicture(UserEntity user, UpdateUserCommand command) {
        if (hasImage(command.image())) {
            validateImage(command.image());
            deletePicture(user.getPictureUrl());
            user.setPictureUrl(imageStorage.uploadProfileImage(command.image()));
        } else if (command.pictureUrl() == null) {
            deletePicture(user.getPictureUrl());
            user.setPictureUrl(null);
        }
    }

    private boolean hasImage(UserImageCommand image) {
        return image != null && !image.isEmpty();
    }

    private void validateImage(UserImageCommand image) {
        if (!"image/png".equals(image.contentType()) && !"image/jpeg".equals(image.contentType())) {
            throw new IllegalArgumentException("Only PNG and JPEG images are allowed.");
        }
        if (image.content().length > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("The maximum image size is 5 MB.");
        }
    }

    private void deletePicture(String pictureUrl) {
        if (pictureUrl != null) imageStorage.deleteProfileImage(pictureUrl);
    }

    private UserEntity synchronize(UserEntity user, ExternalUserProfile externalUser) {
        boolean changed = false;
        changed |= setIfDifferent(user.getEmail(), externalUser.email(), user::setEmail);
        changed |= setIfDifferent(user.getFirstName(), externalUser.firstName(), user::setFirstName);
        changed |= setIfDifferent(user.getLastName(), externalUser.lastName(), user::setLastName);
        changed |= setIfDifferent(user.getPhoneNumber(), externalUser.phoneNumber(), user::setPhoneNumber);
        return changed ? userRepository.saveAndFlush(user) : user;
    }

    private boolean setIfDifferent(String current, String replacement, java.util.function.Consumer<String> setter) {
        if (Objects.equals(current, replacement)) return false;
        setter.accept(replacement);
        return true;
    }

    private UserEntity createOrLinkUser(ExternalUserProfile externalUser, String requestedAuth0Id) {
        if (externalUser.email() != null) {
            UserEntity existing = userRepository.findByEmailIgnoreCase(externalUser.email()).orElse(null);
            if (existing != null) return linkOrReject(existing, externalUser, requestedAuth0Id);
        }

        UserEntity user = UserEntity.builder()
                .auth0Id(externalUser.id())
                .email(externalUser.email())
                .pseudo(generatePseudo(externalUser.email()))
                .firstName(externalUser.firstName())
                .lastName(externalUser.lastName())
                .pictureUrl(externalUser.pictureUrl())
                .phoneNumber(externalUser.phoneNumber())
                .active(true)
                .build();
        try {
            UserEntity created = userRepository.saveAndFlush(user);
            LOGGER.info("Created user", keyValue("action", "create_user"), keyValue("userId", created.getId()));
            return created;
        } catch (DataIntegrityViolationException exception) {
            throw new UserConflictException("The user could not be created.");
        }
    }

    private UserEntity linkOrReject(
            UserEntity existing, ExternalUserProfile externalUser, String secondaryAuth0Id) {
        String primaryAuth0Id = existing.getAuth0Id();
        if (Objects.equals(primaryAuth0Id, secondaryAuth0Id)) return existing;
        int separator = secondaryAuth0Id.indexOf('|');
        if (primaryAuth0Id == null || separator <= 0) {
            throw new UserEmailAlreadyUsedException(externalUser.email());
        }
        String provider = secondaryAuth0Id.substring(0, separator);
        if (!identityProvider.linkIdentity(primaryAuth0Id, secondaryAuth0Id, provider)) {
            throw new UserEmailAlreadyUsedException(externalUser.email());
        }
        try {
            return synchronize(existing, identityProvider.getUser(primaryAuth0Id));
        } catch (com.blockout.users.user.application.exceptions.IdentityProviderException exception) {
            LOGGER.warn("Linked identities but could not refresh the primary profile",
                    keyValue("action", "update_user_after_linking_failed"),
                    keyValue("primaryAuth0Id", primaryAuth0Id));
            return existing;
        }
    }

    private String generatePseudo(String email) {
        String base = email != null && email.contains("@") ? email.substring(0, email.indexOf('@')) : "user";
        base = normalizePseudo(base);
        if (!userRepository.existsByPseudoIgnoreCase(base)) return base;
        for (int suffix = 2; suffix <= 200; suffix++) {
            String candidate = base + "-" + suffix;
            if (!userRepository.existsByPseudoIgnoreCase(candidate)) return candidate;
        }
        return base + "-" + Long.toString(System.nanoTime(), 36);
    }

    private String normalizePseudo(String raw) {
        if (raw == null || raw.isBlank()) return "user";
        String normalized = raw.trim().toLowerCase()
                .replaceAll("\\s+", "-")
                .replaceAll("[^a-z0-9._-]", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("(^-+)|(-+$)", "");
        if (normalized.isBlank()) normalized = "user";
        if (normalized.length() > 30) normalized = normalized.substring(0, 30).replaceAll("(-+$)", "");
        return normalized;
    }

    private UserView toView(UserEntity user) {
        List<UserFavoriteSummaryView> favorites = user.getFavorites() == null ? null : user.getFavorites().stream()
                .map(favorite -> new UserFavoriteSummaryView(favorite.getEntityType(), favorite.getEntityId()))
                .toList();
        return new UserView(
                user.getId(), user.getAuth0Id(), user.getEmail(), user.getPseudo(), user.getFirstName(),
                user.getLastName(), user.getPictureUrl(), user.getPhoneNumber(), user.getActive(),
                user.getCreatedAt(), user.getLastUpdate(), favorites);
    }
}
