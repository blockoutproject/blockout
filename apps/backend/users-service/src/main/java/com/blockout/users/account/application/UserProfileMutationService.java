package com.blockout.users.account.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.users.exceptions.ConflictException;
import com.blockout.users.exceptions.CustomUserNotFoundException;
import com.blockout.users.models.entities.CustomUser;
import com.blockout.users.repositories.UserRepository;
import com.blockout.users.utils.DiffUtils;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Applies profile mutations while retaining current pseudo, image, and reactivation behavior. */
@Service
@RequiredArgsConstructor
public class UserProfileMutationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserProfileMutationService.class);

    private final UserRepository userRepository;
    private final ProfileImageStorage imageStorage;

    /** Updates one account from explicit text and image intent. */
    @Transactional
    public CustomUser update(String auth0Id, UpdateUserProfileCommand command) {
        return userRepository.findByAuth0Id(auth0Id).map(existing -> {
            CustomUser before = existing.toBuilder().build();
            updatePseudo(existing, auth0Id, command.pseudo());
            updatePicture(existing, command.imageChange());
            reactivate(existing, auth0Id);
            return save(existing, before, auth0Id, command.pseudo());
        }).orElseThrow(() -> {
            LOGGER.error("User not found. Cannot update.",
                    keyValue("action", "update_user"),
                    keyValue("auth0Id", auth0Id));
            return new CustomUserNotFoundException(auth0Id);
        });
    }

    /** Applies the retained trim, empty-value, and case-insensitive uniqueness rules. */
    private void updatePseudo(CustomUser existing, String auth0Id, String pseudo) {
        if (pseudo == null) {
            return;
        }
        String requested = pseudo.trim();
        if (requested.isEmpty() || Objects.equals(requested, existing.getPseudo())) {
            return;
        }
        if (userRepository.existsByPseudoIgnoreCaseAndIdNot(requested, existing.getId())) {
            LOGGER.error("Pseudo déjà utilisé",
                    keyValue("action", "update_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("requestedPseudo", requested));
            throw new ConflictException("Ce pseudo est déjà utilisé.");
        }
        existing.setPseudo(requested);
    }

    /** Applies explicit keep, remove, or replace image intent with the retained storage ordering. */
    private void updatePicture(CustomUser existing, UserProfileImageChange change) {
        switch (change.mode()) {
            case KEEP -> {
                return;
            }
            case REMOVE -> {
                deleteStoredPicture(existing);
                existing.setPictureUrl(null);
            }
            case REPLACE -> {
                deleteStoredPicture(existing);
                existing.setPictureUrl(imageStorage.upload(change.upload(), "users"));
            }
        }
    }

    /** Deletes the current object only when a picture URL is present. */
    private void deleteStoredPicture(CustomUser existing) {
        if (existing.getPictureUrl() != null) {
            imageStorage.deleteByUrl(existing.getPictureUrl());
        }
    }

    /** Preserves the current profile-update reactivation behavior. */
    private void reactivate(CustomUser existing, String auth0Id) {
        if (!existing.getActive()) {
            existing.setActive(true);
            LOGGER.info("Utilisateur réactivé",
                    keyValue("action", "reactivate_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("userId", existing.getId()));
        }
    }

    /** Saves the mutation and retains the current pseudo-conflict response. */
    private CustomUser save(CustomUser existing, CustomUser before, String auth0Id, String requestedPseudo) {
        try {
            CustomUser updated = userRepository.save(existing);
            DiffUtils.logChanges(before, updated, LOGGER, "update_user", updated.getId());
            return updated;
        } catch (DataIntegrityViolationException exception) {
            LOGGER.error("Violation d'intégrité lors de la mise à jour de l'utilisateur",
                    keyValue("action", "update_user"),
                    keyValue("auth0Id", auth0Id),
                    keyValue("requestedPseudo", requestedPseudo), exception);
            throw new ConflictException("Ce pseudo est déjà utilisé.");
        }
    }
}
