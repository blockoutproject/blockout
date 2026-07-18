package com.blockout.users.account.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.users.exceptions.CustomUserEmailAlreadyUsedException;
import com.blockout.users.favorite.application.FavoriteView;
import com.blockout.users.models.enums.EntityType;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Protects identity synchronization, linking, deletion, and role compatibility behavior. */
@DisplayName("User identity application service")
class UserIdentityApplicationServiceUnitTest {

    @Test
    @DisplayName("synchronizes retained external profile fields only")
    void synchronizesRetainedExternalProfileFieldsOnly() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.account("auth0|owner", "old@example.com");
        fixture.local.pseudo = "local-pseudo";
        fixture.local.pictureUrl = "https://cdn.example/local.png";
        fixture.local.active = false;
        fixture.identities.profiles.put("auth0|owner", fixture.profile("auth0|owner", "new@example.com"));

        UserAccountView result = fixture.service.ensureCurrent("auth0|owner");

        assertThat(result.email()).isEqualTo("new@example.com");
        assertThat(result.firstName()).isEqualTo("First");
        assertThat(result.lastName()).isEqualTo("Last");
        assertThat(result.phoneNumber()).isEqualTo("+33123456789");
        assertThat(result.pseudo()).isEqualTo("local-pseudo");
        assertThat(result.pictureUrl()).isEqualTo("https://cdn.example/local.png");
        assertThat(result.active()).isFalse();
        assertThat(fixture.calls).containsExactly("identityGet:auth0|owner", "save");
    }

    @Test
    @DisplayName("creates a local account from the external profile")
    void createsLocalAccountFromExternalProfile() {
        Fixture fixture = new Fixture();
        fixture.identities.profiles.put("auth0|new", fixture.profile("auth0|new", "New.User@example.com"));

        UserAccountView result = fixture.service.ensureCurrent("auth0|new");

        assertThat(result.id()).isEqualTo(7L);
        assertThat(result.auth0Id()).isEqualTo("auth0|new");
        assertThat(result.pseudo()).isEqualTo("new.user");
        assertThat(result.pictureUrl()).isEqualTo("https://identity.example/picture.png");
        assertThat(result.active()).isTrue();
        assertThat(fixture.calls).containsExactly("identityGet:auth0|new", "save");
    }

    @Test
    @DisplayName("links a same-email secondary identity to the primary account")
    void linksSameEmailSecondaryIdentityToPrimaryAccount() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.account("auth0|primary", "shared@example.com");
        fixture.identities.profiles.put(
                "google-oauth2|secondary", fixture.profile("google-oauth2|secondary", "shared@example.com"));
        fixture.identities.profiles.put("auth0|primary", fixture.profile("auth0|primary", "primary@example.com"));

        UserAccountView result = fixture.service.ensureCurrent("google-oauth2|secondary");

        assertThat(result.auth0Id()).isEqualTo("auth0|primary");
        assertThat(result.email()).isEqualTo("primary@example.com");
        assertThat(fixture.calls).containsExactly(
                "identityGet:google-oauth2|secondary",
                "identityLink:auth0|primary:google-oauth2|secondary",
                "identityGet:auth0|primary",
                "save");
    }

    @Test
    @DisplayName("keeps the same-email conflict when linking fails")
    void keepsSameEmailConflictWhenLinkingFails() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.account("auth0|primary", "shared@example.com");
        fixture.identities.linkResult = false;
        fixture.identities.profiles.put(
                "google-oauth2|secondary", fixture.profile("google-oauth2|secondary", "shared@example.com"));

        assertThatThrownBy(() -> fixture.service.ensureCurrent("google-oauth2|secondary"))
                .isInstanceOf(CustomUserEmailAlreadyUsedException.class);

        assertThat(fixture.calls).containsExactly(
                "identityGet:google-oauth2|secondary",
                "identityLink:auth0|primary:google-oauth2|secondary");
    }

    @Test
    @DisplayName("keeps the primary local account when post-link resync fails")
    void keepsPrimaryLocalAccountWhenPostLinkResyncFails() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.account("auth0|primary", "shared@example.com");
        fixture.identities.profiles.put(
                "google-oauth2|secondary", fixture.profile("google-oauth2|secondary", "shared@example.com"));
        fixture.identities.failedGets.add("auth0|primary");

        UserAccountView result = fixture.service.ensureCurrent("google-oauth2|secondary");

        assertThat(result.auth0Id()).isEqualTo("auth0|primary");
        assertThat(result.email()).isEqualTo("shared@example.com");
        assertThat(fixture.calls).containsExactly(
                "identityGet:google-oauth2|secondary",
                "identityLink:auth0|primary:google-oauth2|secondary",
                "identityGet:auth0|primary");
    }

    @Test
    @DisplayName("deletes identity before favorite events and local account")
    void deletesIdentityBeforeFavoriteEventsAndLocalAccount() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.account("auth0|owner", "owner@example.com");
        fixture.local.favorites = List.of(new FavoriteView(5L, EntityType.TEAM, 11L, null));

        fixture.service.deleteCurrent("auth0|owner");

        assertThat(fixture.calls).containsExactly(
                "identityDelete:auth0|owner", "favoriteDeleted:7:TEAM:11", "localDelete");
        assertThat(fixture.local).isNull();
    }

    @Test
    @DisplayName("stops deletion when the identity provider fails")
    void stopsDeletionWhenIdentityProviderFails() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.account("auth0|owner", "owner@example.com");
        fixture.identities.failDelete = true;

        assertThatThrownBy(() -> fixture.service.deleteCurrent("auth0|owner"))
                .isInstanceOf(UserIdentityProviderException.class);

        assertThat(fixture.calls).containsExactly("identityDelete:auth0|owner");
        assertThat(fixture.local).isNotNull();
    }

    @Test
    @DisplayName("keeps the provider-first failure window when outbox recording fails")
    void keepsProviderFirstFailureWindowWhenOutboxRecordingFails() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.account("auth0|owner", "owner@example.com");
        fixture.local.favorites = List.of(new FavoriteView(5L, EntityType.TEAM, 11L, null));
        fixture.failFavoriteEvent = true;

        assertThatThrownBy(() -> fixture.service.deleteCurrent("auth0|owner"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("outbox failure");

        assertThat(fixture.calls).containsExactly(
                "identityDelete:auth0|owner", "favoriteDeleted:7:TEAM:11");
        assertThat(fixture.local).isNotNull();
    }

    @Test
    @DisplayName("wraps default-role provider failures")
    void wrapsDefaultRoleProviderFailures() {
        Fixture fixture = new Fixture();
        fixture.identities.failRole = true;

        assertThatThrownBy(() -> fixture.service.assignDefaultRole("auth0|owner"))
                .isInstanceOf(DefaultRoleAssignmentException.class)
                .hasMessage("Erreur assignation rôle");
    }

    /** Supplies deterministic identity, persistence, and event doubles. */
    private static final class Fixture {

        private static final Instant CREATED_AT = Instant.parse("2026-07-01T10:00:00Z");

        private final List<String> calls = new ArrayList<>();
        private final RecordingIdentityProvider identities = new RecordingIdentityProvider(calls);
        private StoredAccount local;
        private boolean failFavoriteEvent;
        private final UserIdentityApplicationService service =
                new UserIdentityApplicationService(
                        identities,
                        store(),
                        new UserAccountDeletionService(identities, store(), deletionEvents()));

        private StoredAccount account(String auth0Id, String email) {
            return new StoredAccount(auth0Id, email);
        }

        private IdentityProfile profile(String id, String email) {
            return new IdentityProfile(
                    id, email, "First", "Last", "https://identity.example/picture.png", "+33123456789");
        }

        private UserAccountStore store() {
            return new UserAccountStore() {
                @Override
                public Optional<UserAccountView> findByAuth0Id(String auth0Id) {
                    return matchingAuth0(auth0Id).map(Fixture.this::view);
                }

                @Override
                public Optional<UserAccountUpdate> findForUpdateByAuth0Id(String auth0Id) {
                    return matchingAuth0(auth0Id).map(ignored -> updateHandle());
                }

                @Override
                public Optional<UserAccountUpdate> findForUpdateByEmail(String email) {
                    return local != null && local.email.equalsIgnoreCase(email)
                            ? Optional.of(updateHandle())
                            : Optional.empty();
                }

                @Override
                public boolean existsByPseudoIgnoringCaseExcept(String pseudo, Long accountId) {
                    return false;
                }

                @Override
                public boolean existsByPseudoIgnoringCase(String pseudo) {
                    return false;
                }

                @Override
                public UserAccountView create(NewUserAccount account) {
                    local = new StoredAccount(account.auth0Id(), account.email());
                    local.pseudo = account.pseudo();
                    local.firstName = account.firstName();
                    local.lastName = account.lastName();
                    local.pictureUrl = account.pictureUrl();
                    local.phoneNumber = account.phoneNumber();
                    local.active = account.active();
                    calls.add("save");
                    return view(local);
                }
            };
        }

        private Optional<StoredAccount> matchingAuth0(String auth0Id) {
            return local != null && local.auth0Id.equals(auth0Id) ? Optional.of(local) : Optional.empty();
        }

        private UserAccountUpdate updateHandle() {
            return new UserAccountUpdate() {
                @Override
                public UserAccountView current() {
                    return view(local);
                }

                @Override
                public UserAccountChange synchronize(UserIdentitySynchronization synchronization) {
                    UserAccountView before = current();
                    local.email = synchronization.email();
                    local.firstName = synchronization.firstName();
                    local.lastName = synchronization.lastName();
                    local.phoneNumber = synchronization.phoneNumber();
                    local.lastUpdate = synchronization.lastUpdate();
                    calls.add("save");
                    return new UserAccountChange(before, current());
                }

                @Override
                public UserAccountChange updateProfile(UserProfileChange change) {
                    throw new UnsupportedOperationException();
                }

                @Override
                public void delete() {
                    calls.add("localDelete");
                    local = null;
                }
            };
        }

        private UserAccountView view(StoredAccount account) {
            return new UserAccountView(
                    7L,
                    account.auth0Id,
                    account.email,
                    account.pseudo,
                    account.firstName,
                    account.lastName,
                    account.pictureUrl,
                    account.phoneNumber,
                    account.active,
                    CREATED_AT,
                    account.lastUpdate,
                    account.favorites);
        }

        private AccountDeletionEventPublisher deletionEvents() {
            return new AccountDeletionEventPublisher() {
                @Override
                public void publishFavoriteDeleted(Long userId, EntityType entityType, Long entityId) {
                    calls.add("favoriteDeleted:" + userId + ":" + entityType + ":" + entityId);
                    if (failFavoriteEvent) {
                        throw new IllegalStateException("outbox failure");
                    }
                }
            };
        }

        private static final class StoredAccount {
            private final String auth0Id;
            private String email;
            private String pseudo = "owner";
            private String firstName;
            private String lastName;
            private String pictureUrl;
            private String phoneNumber;
            private boolean active = true;
            private Instant lastUpdate = CREATED_AT;
            private List<FavoriteView> favorites = List.of();

            private StoredAccount(String auth0Id, String email) {
                this.auth0Id = auth0Id;
                this.email = email;
            }
        }
    }

    /** Records application calls while simulating provider-owned outcomes. */
    private static final class RecordingIdentityProvider implements IdentityProvider {

        private final List<String> calls;
        private final Map<String, IdentityProfile> profiles = new HashMap<>();
        private final Set<String> failedGets = new HashSet<>();
        private boolean linkResult = true;
        private boolean failDelete;
        private boolean failRole;

        private RecordingIdentityProvider(List<String> calls) {
            this.calls = calls;
        }

        @Override
        public IdentityProfile get(String auth0Id) {
            calls.add("identityGet:" + auth0Id);
            if (failedGets.contains(auth0Id)) {
                throw failure();
            }
            return profiles.get(auth0Id);
        }

        @Override
        public void delete(String auth0Id) {
            calls.add("identityDelete:" + auth0Id);
            if (failDelete) {
                throw failure();
            }
        }

        @Override
        public boolean link(String primaryAuth0Id, String secondaryAuth0Id) {
            calls.add("identityLink:" + primaryAuth0Id + ":" + secondaryAuth0Id);
            return linkResult;
        }

        @Override
        public void assignDefaultRole(String auth0Id) {
            calls.add("identityRole:" + auth0Id);
            if (failRole) {
                throw failure();
            }
        }

        private UserIdentityProviderException failure() {
            return new UserIdentityProviderException(new IllegalStateException("identity failure"));
        }
    }
}
