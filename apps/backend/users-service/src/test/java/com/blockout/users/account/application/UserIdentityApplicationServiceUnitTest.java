package com.blockout.users.account.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.users.exceptions.CustomUserEmailAlreadyUsedException;
import com.blockout.users.favorite.application.FavoriteEventPublisher;
import com.blockout.users.favorite.application.FavoriteView;
import com.blockout.users.models.entities.CustomUser;
import com.blockout.users.models.entities.UserFavorite;
import com.blockout.users.models.enums.EntityType;
import com.blockout.users.repositories.UserRepository;
import java.lang.reflect.Proxy;
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

    /** Proves ensure synchronizes only the same four Auth0-owned fields as before. */
    @Test
    @DisplayName("synchronizes retained external profile fields only")
    void synchronizesRetainedExternalProfileFieldsOnly() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.user("auth0|owner", "old@example.com");
        fixture.local.setPseudo("local-pseudo");
        fixture.local.setPictureUrl("https://cdn.example/local.png");
        fixture.local.setActive(false);
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

    /** Proves a new account retains Auth0 profile initialization and normalized pseudo generation. */
    @Test
    @DisplayName("creates a local account from the external profile")
    void createsLocalAccountFromExternalProfile() {
        Fixture fixture = new Fixture();
        fixture.identities.profiles.put(
                "auth0|new", fixture.profile("auth0|new", "New.User@example.com"));

        UserAccountView result = fixture.service.ensureCurrent("auth0|new");

        assertThat(result.id()).isEqualTo(7L);
        assertThat(result.auth0Id()).isEqualTo("auth0|new");
        assertThat(result.pseudo()).isEqualTo("new.user");
        assertThat(result.pictureUrl()).isEqualTo("https://identity.example/picture.png");
        assertThat(result.active()).isTrue();
        assertThat(fixture.calls).containsExactly("identityGet:auth0|new", "save");
    }

    /** Proves a same-email identity links to and resynchronizes the retained primary account. */
    @Test
    @DisplayName("links a same-email secondary identity to the primary account")
    void linksSameEmailSecondaryIdentityToPrimaryAccount() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.user("auth0|primary", "shared@example.com");
        fixture.identities.profiles.put(
                "google-oauth2|secondary", fixture.profile("google-oauth2|secondary", "shared@example.com"));
        fixture.identities.profiles.put(
                "auth0|primary", fixture.profile("auth0|primary", "primary@example.com"));

        UserAccountView result = fixture.service.ensureCurrent("google-oauth2|secondary");

        assertThat(result.auth0Id()).isEqualTo("auth0|primary");
        assertThat(result.email()).isEqualTo("primary@example.com");
        assertThat(fixture.calls).containsExactly(
                "identityGet:google-oauth2|secondary",
                "identityLink:auth0|primary:google-oauth2|secondary",
                "identityGet:auth0|primary",
                "save");
    }

    /** Proves a linking failure retains the historical same-email conflict. */
    @Test
    @DisplayName("keeps the same-email conflict when linking fails")
    void keepsSameEmailConflictWhenLinkingFails() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.user("auth0|primary", "shared@example.com");
        fixture.identities.linkResult = false;
        fixture.identities.profiles.put(
                "google-oauth2|secondary", fixture.profile("google-oauth2|secondary", "shared@example.com"));

        assertThatThrownBy(() -> fixture.service.ensureCurrent("google-oauth2|secondary"))
                .isInstanceOf(CustomUserEmailAlreadyUsedException.class);

        assertThat(fixture.calls).containsExactly(
                "identityGet:google-oauth2|secondary",
                "identityLink:auth0|primary:google-oauth2|secondary");
    }

    /** Proves a post-link provider failure still returns the retained primary local account. */
    @Test
    @DisplayName("keeps the primary local account when post-link resync fails")
    void keepsPrimaryLocalAccountWhenPostLinkResyncFails() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.user("auth0|primary", "shared@example.com");
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

    /** Proves account deletion remains provider first, then events, then local deletion. */
    @Test
    @DisplayName("deletes identity before favorite events and local account")
    void deletesIdentityBeforeFavoriteEventsAndLocalAccount() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.user("auth0|owner", "owner@example.com");
        fixture.local.setFavorites(List.of(UserFavorite.builder()
                .id(5L)
                .user(fixture.local)
                .entityType(EntityType.TEAM)
                .entityId(11L)
                .build()));

        fixture.service.deleteCurrent("auth0|owner");

        assertThat(fixture.calls).containsExactly(
                "identityDelete:auth0|owner", "favoriteDeleted:7:TEAM:11", "localDelete");
        assertThat(fixture.local).isNull();
    }

    /** Proves provider deletion failure prevents every local side effect. */
    @Test
    @DisplayName("stops deletion when the identity provider fails")
    void stopsDeletionWhenIdentityProviderFails() {
        Fixture fixture = new Fixture();
        fixture.local = fixture.user("auth0|owner", "owner@example.com");
        fixture.identities.failDelete = true;

        assertThatThrownBy(() -> fixture.service.deleteCurrent("auth0|owner"))
                .isInstanceOf(UserIdentityProviderException.class);

        assertThat(fixture.calls).containsExactly("identityDelete:auth0|owner");
        assertThat(fixture.local).isNotNull();
    }

    /** Proves Auth0 role failures keep the historical generic service boundary. */
    @Test
    @DisplayName("wraps default-role provider failures")
    void wrapsDefaultRoleProviderFailures() {
        Fixture fixture = new Fixture();
        fixture.identities.failRole = true;

        assertThatThrownBy(() -> fixture.service.assignDefaultRole("auth0|owner"))
                .isInstanceOf(DefaultRoleAssignmentException.class)
                .hasMessage("Erreur assignation rôle");
    }

    /** Supplies deterministic identity, persistence, mapper, and event doubles. */
    private static final class Fixture {

        private final List<String> calls = new ArrayList<>();
        private final RecordingIdentityProvider identities = new RecordingIdentityProvider(calls);
        private CustomUser local;

        private final UserIdentityApplicationService service = new UserIdentityApplicationService(
                identities,
                repository(),
                this::view,
                favoriteEvents());

        /** Builds one local account with stable timestamps. */
        private CustomUser user(String auth0Id, String email) {
            return CustomUser.builder()
                    .id(7L)
                    .auth0Id(auth0Id)
                    .email(email)
                    .pseudo("owner")
                    .active(true)
                    .createdAt(Instant.parse("2026-07-01T10:00:00Z"))
                    .lastUpdate(Instant.parse("2026-07-01T10:00:00Z"))
                    .favorites(List.of())
                    .build();
        }

        /** Builds one provider profile used by ensure tests. */
        private IdentityProfile profile(String id, String email) {
            return new IdentityProfile(
                    id,
                    email,
                    "First",
                    "Last",
                    "https://identity.example/picture.png",
                    "+33123456789");
        }

        /** Maps local state to the immutable account view used by the public use case. */
        private UserAccountView view(CustomUser user) {
            List<FavoriteView> favorites = user.getFavorites() == null
                    ? null
                    : user.getFavorites().stream()
                            .map(favorite -> new FavoriteView(
                                    favorite.getId(),
                                    favorite.getEntityType(),
                                    favorite.getEntityId(),
                                    favorite.getCreatedAt()))
                            .toList();
            return new UserAccountView(
                    user.getId(),
                    user.getAuth0Id(),
                    user.getEmail(),
                    user.getPseudo(),
                    user.getFirstName(),
                    user.getLastName(),
                    user.getPictureUrl(),
                    user.getPhoneNumber(),
                    user.getActive(),
                    user.getCreatedAt(),
                    user.getLastUpdate(),
                    favorites);
        }

        /** Provides only the local persistence operations exercised by identity workflows. */
        private UserRepository repository() {
            return (UserRepository) Proxy.newProxyInstance(
                    UserRepository.class.getClassLoader(),
                    new Class<?>[] {UserRepository.class},
                    (proxy, method, arguments) -> switch (method.getName()) {
                        case "findByAuth0Id" -> local != null && local.getAuth0Id().equals(arguments[0])
                                ? Optional.of(local)
                                : Optional.empty();
                        case "findByEmailIgnoreCase" -> local != null && local.getEmail().equalsIgnoreCase((String) arguments[0])
                                ? Optional.of(local)
                                : Optional.empty();
                        case "existsByPseudoIgnoreCase" -> false;
                        case "save" -> {
                            calls.add("save");
                            local = (CustomUser) arguments[0];
                            if (local.getId() == null) {
                                local.setId(7L);
                            }
                            yield local;
                        }
                        case "delete" -> {
                            calls.add("localDelete");
                            local = null;
                            yield null;
                        }
                        case "toString" -> "UserRepositoryDouble";
                        case "hashCode" -> System.identityHashCode(proxy);
                        case "equals" -> proxy == arguments[0];
                        default -> throw new UnsupportedOperationException(method.getName());
                    });
        }

        /** Records retained favorite deletion events in sequence. */
        private FavoriteEventPublisher favoriteEvents() {
            return new FavoriteEventPublisher() {
                @Override
                public void publishCreated(Long userId, EntityType entityType, Long entityId) {
                    throw new UnsupportedOperationException();
                }

                @Override
                public void publishDeleted(Long userId, EntityType entityType, Long entityId) {
                    calls.add("favoriteDeleted:" + userId + ":" + entityType + ":" + entityId);
                }
            };
        }
    }

    /** Records application calls while simulating only provider-owned outcomes. */
    private static final class RecordingIdentityProvider implements IdentityProvider {

        private final List<String> calls;
        private final Map<String, IdentityProfile> profiles = new HashMap<>();
        private final Set<String> failedGets = new HashSet<>();
        private boolean linkResult = true;
        private boolean failDelete;
        private boolean failRole;

        /** Creates the provider double around the shared call trace. */
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

        /** Creates the application-owned provider failure used by compatibility paths. */
        private UserIdentityProviderException failure() {
            return new UserIdentityProviderException(new IllegalStateException("identity failure"));
        }
    }
}
