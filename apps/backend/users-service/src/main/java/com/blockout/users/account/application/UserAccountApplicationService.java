package com.blockout.users.account.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.users.exceptions.CustomUserNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Implements account/profile boundaries over application-owned identity and profile collaborators. */
@Service
@RequiredArgsConstructor
public class UserAccountApplicationService implements UserAccountService {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserAccountApplicationService.class);

    private final UserAccountStore accounts;
    private final UserProfileMutationService profileMutations;
    private final UserIdentityService identities;

    /** {@inheritDoc} */
    @Override
    public UserAccountView getByAuth0Id(String auth0Id) {
        return accounts.findByAuth0Id(auth0Id)
                .orElseThrow(() -> {
                    LOGGER.warn("Utilisateur introuvable", keyValue("auth0Id", auth0Id));
                    return new CustomUserNotFoundException(auth0Id);
                });
    }

    /** {@inheritDoc} */
    @Override
    public UserAccountView updateByAuth0Id(String auth0Id, UpdateUserProfileCommand command) {
        return profileMutations.update(auth0Id, command);
    }

    /** {@inheritDoc} */
    @Override
    public UserAccountView ensureCurrent(String auth0Id) {
        return identities.ensureCurrent(auth0Id);
    }

    /** {@inheritDoc} */
    @Override
    public void deleteCurrent(String auth0Id) {
        identities.deleteCurrent(auth0Id);
    }
}
