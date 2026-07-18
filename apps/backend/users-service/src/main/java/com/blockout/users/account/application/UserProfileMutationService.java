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
    private final ProfileImagePlanExecutor imagePlans;

    /** Updates one account from explicit text and image intent. */
    @Transactional
    public UserAccountView update(String auth0Id, UpdateUserProfileCommand command) {
        return accounts.findForUpdateByAuth0Id(auth0Id).map(update -> {
            UserAccountView existing = update.current();
            String pseudo = updatePseudo(existing, auth0Id, command.pseudo());
            ProfileImageMutationResult picture = imagePlans.execute(
                    ProfileImageMutationPlan.from(existing.pictureUrl(), command.imageChange()));
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
            ProfileImageMutationResult picture,
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

}
