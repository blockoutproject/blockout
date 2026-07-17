package com.blockout.users.account.infrastructure.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.users.config.Auth0Properties;
import com.blockout.users.config.Auth0TokenManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verifies identity-link input decisions that occur before the Auth0 SDK boundary. */
@DisplayName("Auth0 identity provider")
class Auth0IdentityProviderUnitTest {

    /** Proves an invalid secondary subject remains a non-throwing link failure. */
    @Test
    @DisplayName("rejects an invalid secondary subject without calling Auth0")
    void rejectsInvalidSecondarySubjectWithoutCallingAuth0() {
        Auth0Properties properties = new Auth0Properties();
        Auth0IdentityProvider provider = new Auth0IdentityProvider(new Auth0TokenManager(properties), properties);

        assertThat(provider.link("auth0|primary", "invalid-subject")).isFalse();
    }

    /** Proves an already-primary subject remains an immediate successful no-op. */
    @Test
    @DisplayName("accepts an already-primary identity as a no-op")
    void acceptsAlreadyPrimaryIdentityAsNoOp() {
        Auth0Properties properties = new Auth0Properties();
        Auth0IdentityProvider provider = new Auth0IdentityProvider(new Auth0TokenManager(properties), properties);

        assertThat(provider.link("auth0|primary", "auth0|primary")).isTrue();
    }
}
