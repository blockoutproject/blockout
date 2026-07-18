package com.blockout.users.account.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.users.exceptions.ConflictException;
import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.users.utils.DiffUtils;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Applies profile mutations while retaining current pseudo, image, and reactivation behavior. */
@Service
@RequiredArgsConstructor
public class UserProfileMutationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserProfileMutationService.class);

    private final UserAccountStore accounts;
    private final ProfileImageStorage imageStorage;

    /** Updates one account from explicit text and image intent. */
    @Transactional
    public UserAccountView update(String auth0Id, UpdateUserProfileCommand command) {
        return accounts.findForUpdateByAuth0Id(auth0Id).map(update -> {
            UserAccountView existing = update.current();
            String pseudo = updatePseudo(existing, auth0Id, command.pseudo());
            PictureChange picture = updatePicture(existing, command.imageChange());
            boolean active = reactivate(existing, auth0Id);
            return save(update, pseudo, picture, active, auth0Id, command.pseudo());
        }).orElseThrow(() -> {
            LOGGER.error("User not found. Cannot update.",
                    keyValue("action", "update_user"),
                    keyValue("auth0Id", auth0Id));
            return new CustomUserNotFoundException(auth0Id);
        });
    }

    /** Applies the retained trim, empty-value, and case-insensitive uniqueness rules. */
    private String updatePseudo(UserAccountView existing, String auth0Id, String pseudo) {
        if (pseudo == null) {
            return null;
        }
        String requested = pseudo.trim();
        if (requested.isEmpty() || Objects.equals(requested, existing.pseudo())) {
            return null;
        }
        if (accounts.existsByPseudoIgnoringCaseExcept(requested, existing.id())) {
            LOGGER.error("Pseudo déjà utilisé",
                    keyValue("action", "update_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("requestedPseudo", requested));
            throw new ConflictException("Ce pseudo est déjà utilisé.");
        }
        return requested;
    }

    /** Applies explicit keep, remove, or replace image intent with the retained storage ordering. */
    private PictureChange updatePicture(UserAccountView existing, UserProfileImageChange change) {
        return switch (change.mode()) {
            case KEEP -> PictureChange.keep();
            case REMOVE -> {
                deleteStoredPicture(existing);
                yield PictureChange.replace(null);
            }
            case REPLACE -> {
                deleteStoredPicture(existing);
                yield PictureChange.replace(imageStorage.upload(change.upload(), "users"));
            }
        };
    }

    /** Deletes the current object only when a picture URL is present. */
    private void deleteStoredPicture(UserAccountView existing) {
        if (existing.pictureUrl() != null) {
            imageStorage.deleteByUrl(existing.pictureUrl());
        }
    }

    /** Preserves the current profile-update reactivation behavior. */
    private boolean reactivate(UserAccountView existing, String auth0Id) {
        if (!existing.active()) {
            LOGGER.info("Utilisateur réactivé",
                    keyValue("action", "reactivate_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("userId", existing.id()));
        }
        return true;
    }

    /** Saves the mutation and retains the current pseudo-conflict response. */
    private UserAccountView save(
            UserAccountUpdate update,
            String pseudo,
            PictureChange picture,
            boolean active,
            String auth0Id,
            String requestedPseudo) {
        try {
            UserAccountChange changed = update.updateProfile(new UserProfileChange(
                    pseudo, pseudo != null, picture.url(), picture.replace(), active));
            DiffUtils.logChanges(changed.before(), changed.after(), LOGGER, "update_user", changed.after().id());
            return changed.after();
        } catch (UserAccountPersistenceException exception) {
            LOGGER.error("Violation d'intégrité lors de la mise à jour de l'utilisateur",
                    keyValue("action", "update_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("requestedPseudo", requestedPseudo), exception);
            throw new ConflictException("Ce pseudo est déjà utilisé.");
        }
    }

    /** Distinguishes keep from explicit nullable replacement at the persistence boundary. */
    private record PictureChange(String url, boolean replace) {

        private static PictureChange keep() {
            return new PictureChange(null, false);
        }

        private static PictureChange replace(String url) {
            return new PictureChange(url, true);
        }
    }
}
