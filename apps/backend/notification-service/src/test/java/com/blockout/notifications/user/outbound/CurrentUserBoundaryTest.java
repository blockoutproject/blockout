package com.blockout.notifications.user.outbound;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.usersclient.api.UserAccountsClient;
import com.blockout.notifications.usersclient.model.UserAccountInternalResponse;
import org.junit.jupiter.api.Test;

class CurrentUserBoundaryTest {

    @Test
    void generatedProviderImmediatelyReducesTheDownstreamModelToItsLocalIdentity() {
        UserAccountInternalResponse response = new UserAccountInternalResponse();
        response.setId(71L);
        UserAccountsClient users = clientReturning(response);

        assertThat(new GeneratedCurrentUserProvider(users).getCurrentUser().id()).isEqualTo(71L);
    }

    @Test
    void generatedProviderPreservesAnEmptyDownstreamBody() {
        UserAccountsClient users = clientReturning(null);

        assertThat(new GeneratedCurrentUserProvider(users).getCurrentUser()).isNull();
    }

    @Test
    void normalizesOnlyKnownVersionedUsersServiceSuffixes() {
        assertThat(UsersServiceUrl.canonicalBasePath("http://users:8080/api/v1/users"))
                .isEqualTo("http://users:8080");
        assertThat(UsersServiceUrl.canonicalBasePath("http://users:8080/api/v2/users/"))
                .isEqualTo("http://users:8080");
        assertThat(UsersServiceUrl.canonicalBasePath("http://users:8080/custom"))
                .isEqualTo("http://users:8080/custom");
    }

    private UserAccountsClient clientReturning(UserAccountInternalResponse result) {
        return new UserAccountsClient() {
            @Override
            public UserAccountInternalResponse getCurrentUser() {
                return result;
            }
        };
    }
}
