package com.blockout.users.user.infrastructure.providers.auth0;

import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.exception.Auth0Exception;
import com.auth0.json.mgmt.users.User;
import com.blockout.users.config.Auth0Properties;
import com.blockout.users.config.Auth0TokenManager;
import com.blockout.users.user.application.exceptions.IdentityProviderException;
import com.blockout.users.user.application.models.ExternalUserProfile;
import com.blockout.users.user.application.ports.UserIdentityProvider;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/**
 * Auth0 adapter for the provider-neutral User identity boundary.
 */
@Component
@RequiredArgsConstructor
public class Auth0UserIdentityProvider implements UserIdentityProvider {

    private static final Logger LOGGER = LoggerFactory.getLogger(Auth0UserIdentityProvider.class);

    private final Auth0TokenManager tokenManager;
    private final Auth0Properties properties;

    @Override
    public ExternalUserProfile getUser(String externalId) {
        try {
            User user = managementApi().users().get(externalId, null).execute().getBody();
            return new ExternalUserProfile(
                user.getId(), user.getEmail(), user.getGivenName(), user.getFamilyName(),
                user.getPicture(), user.getPhoneNumber());
        } catch (Auth0Exception exception) {
            throw new IdentityProviderException("Unable to retrieve the Auth0 user.", exception);
        }
    }

    @Override
    public void deleteUser(String externalId) {
        try {
            managementApi().users().delete(externalId).execute();
        } catch (Auth0Exception exception) {
            throw new IdentityProviderException("Unable to delete the Auth0 user.", exception);
        }
    }

    @Override
    public void assignDefaultRole(String externalId) {
        try {
            managementApi().users().addRoles(externalId, List.of(properties.getDefaultUserRoleId())).execute();
        } catch (Auth0Exception exception) {
            throw new IdentityProviderException("Unable to assign the default Auth0 role.", exception);
        }
    }

    @Override
    public boolean linkIdentity(String primaryExternalId, String secondaryExternalId, String provider) {
        try {
            managementApi().users()
                .linkIdentity(primaryExternalId, secondaryExternalId, provider, null)
                .execute();
            return true;
        } catch (Auth0Exception | RuntimeException exception) {
            LOGGER.warn("Unable to link Auth0 identities",
                keyValue("action", "link_accounts_failed"),
                keyValue("primaryAuth0Id", primaryExternalId),
                keyValue("secondaryAuth0Id", secondaryExternalId),
                exception);
            return false;
        }
    }

    private ManagementAPI managementApi() {
        return tokenManager.getManagementAPI();
    }
}
