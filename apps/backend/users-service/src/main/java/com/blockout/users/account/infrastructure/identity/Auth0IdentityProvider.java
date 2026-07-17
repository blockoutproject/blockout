package com.blockout.users.account.infrastructure.identity;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.exception.Auth0Exception;
import com.auth0.json.mgmt.users.User;
import com.blockout.users.account.application.IdentityProfile;
import com.blockout.users.account.application.IdentityProvider;
import com.blockout.users.account.application.UserIdentityProviderException;
import com.blockout.users.config.Auth0Properties;
import com.blockout.users.config.Auth0TokenManager;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Adapts the Auth0 Management API to application-owned identity operations. */
@Component
@RequiredArgsConstructor
public class Auth0IdentityProvider implements IdentityProvider {

    private static final Logger LOGGER = LoggerFactory.getLogger(Auth0IdentityProvider.class);

    private final Auth0TokenManager tokenManager;
    private final Auth0Properties properties;

    /** {@inheritDoc} */
    @Override
    public IdentityProfile get(String auth0Id) {
        try {
            User user = management().users().get(auth0Id, null).execute().getBody();
            return new IdentityProfile(
                    user.getId(),
                    user.getEmail(),
                    user.getGivenName(),
                    user.getFamilyName(),
                    user.getPicture(),
                    user.getPhoneNumber());
        } catch (Auth0Exception exception) {
            LOGGER.error("Erreur lors de la récupération de l'utilisateur Auth0",
                    keyValue("action", "identity_get"), keyValue("auth0Id", auth0Id), exception);
            throw new UserIdentityProviderException(exception);
        }
    }

    /** {@inheritDoc} */
    @Override
    public void delete(String auth0Id) {
        try {
            management().users().delete(auth0Id).execute();
        } catch (Auth0Exception exception) {
            LOGGER.error("Erreur Auth0 lors de la suppression de l'utilisateur",
                    keyValue("action", "identity_delete"), keyValue("auth0Id", auth0Id), exception);
            throw new UserIdentityProviderException(exception);
        }
    }

    /** {@inheritDoc} */
    @Override
    public boolean link(String primaryAuth0Id, String secondaryAuth0Id) {
        if (primaryAuth0Id == null || primaryAuth0Id.equals(secondaryAuth0Id)) {
            return primaryAuth0Id != null;
        }
        int separator = secondaryAuth0Id.indexOf('|');
        if (separator <= 0) {
            LOGGER.error("Auth0Id invalide, impossible d'extraire le provider",
                    keyValue("action", "identity_link_parse_failed"),
                    keyValue("secondaryAuth0Id", secondaryAuth0Id));
            return false;
        }

        try {
            String provider = secondaryAuth0Id.substring(0, separator);
            management().users().linkIdentity(primaryAuth0Id, secondaryAuth0Id, provider, null).execute();
            return true;
        } catch (Auth0Exception | RuntimeException exception) {
            LOGGER.error("Échec du linking Auth0",
                    keyValue("action", "identity_link_failed"),
                    keyValue("primaryAuth0Id", primaryAuth0Id),
                    keyValue("secondaryAuth0Id", secondaryAuth0Id), exception);
            return false;
        }
    }

    /** {@inheritDoc} */
    @Override
    public void assignDefaultRole(String auth0Id) {
        try {
            management().users().addRoles(auth0Id, List.of(properties.getDefaultUserRoleId())).execute();
        } catch (Auth0Exception exception) {
            LOGGER.error("Erreur lors de l'assignation du rôle par défaut",
                    keyValue("auth0Id", auth0Id), exception);
            throw new UserIdentityProviderException(exception);
        }
    }

    /** Resolves the currently retained token-backed Management API client. */
    private ManagementAPI management() {
        return tokenManager.getManagementAPI();
    }
}
