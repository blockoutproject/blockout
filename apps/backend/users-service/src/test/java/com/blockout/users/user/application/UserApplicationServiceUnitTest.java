package com.blockout.users.user.application;

import com.blockout.users.user.application.commands.UpdateUserCommand;
import com.blockout.users.user.application.models.EntityType;
import com.blockout.users.user.application.models.ExternalUserProfile;
import com.blockout.users.user.application.ports.UserFollowPublisher;
import com.blockout.users.user.application.ports.UserIdentityProvider;
import com.blockout.users.user.application.ports.UserImageStorage;
import com.blockout.users.user.infrastructure.persistence.entities.UserEntity;
import com.blockout.users.user.infrastructure.persistence.entities.UserFavoriteEntity;
import com.blockout.users.user.infrastructure.persistence.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("User application service")
class UserApplicationServiceUnitTest {

    @Mock
    private UserRepository repository;
    @Mock
    private UserIdentityProvider identityProvider;
    @Mock
    private UserImageStorage imageStorage;
    @Mock
    private UserFollowPublisher followPublisher;

    private UserApplicationService service;

    @BeforeEach
    void setUp() {
        service = new UserApplicationService(repository, identityProvider, imageStorage, followPublisher);
    }

    @Test
    @DisplayName("returns the authoritative User view with favorite summaries")
    void returnsCompleteUserView() {
        UserEntity user = user();
        user.setFavorites(List.of(UserFavoriteEntity.builder()
            .id(2L).user(user).entityType(EntityType.TEAM).entityId(3L).build()));
        when(repository.findByAuth0IdWithFavorites("auth0|1")).thenReturn(Optional.of(user));

        var result = service.getUserByAuth0Id("auth0|1");

        assertThat(result.auth0Id()).isEqualTo("auth0|1");
        assertThat(result.favorites()).hasSize(1);
        assertThat(result.favorites().getFirst().entityId()).isEqualTo(3L);
    }

    @Test
    @DisplayName("creates a local User from the provider-neutral identity profile")
    void createsUserFromExternalProfile() {
        ExternalUserProfile profile = new ExternalUserProfile(
            "auth0|1", "user@example.com", "First", "Last", "picture", "phone");
        when(identityProvider.getUser("auth0|1")).thenReturn(profile);
        when(repository.findByAuth0Id("auth0|1")).thenReturn(Optional.empty());
        when(repository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.empty());
        when(repository.existsByPseudoIgnoreCase("user")).thenReturn(false);
        when(repository.saveAndFlush(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> {
            UserEntity entity = invocation.getArgument(0);
            entity.setId(1L);
            entity.setCreatedAt(Instant.parse("2026-07-19T12:00:00Z"));
            entity.setLastUpdate(Instant.parse("2026-07-19T12:00:00Z"));
            return entity;
        });

        var created = service.ensureCurrentUser("auth0|1");

        assertThat(created.pseudo()).isEqualTo("user");
        assertThat(created.firstName()).isEqualTo("First");
        assertThat(created.active()).isTrue();
        assertThat(created.createdAt()).isNotNull();
    }

    @Test
    @DisplayName("keeps a stored picture when the established request carries its URL")
    void keepsPictureWhenUrlIsPresent() {
        UserEntity user = user();
        when(repository.findByAuth0Id("auth0|1")).thenReturn(Optional.of(user));
        when(repository.saveAndFlush(user)).thenReturn(user);

        var updated = service.updateUser("auth0|1", new UpdateUserCommand("new-pseudo", "picture", null));

        assertThat(updated.pseudo()).isEqualTo("new-pseudo");
        assertThat(updated.pictureUrl()).isEqualTo("picture");
        verify(imageStorage, never()).deleteProfileImage("picture");
    }

    private UserEntity user() {
        Instant now = Instant.parse("2026-07-19T12:00:00Z");
        return UserEntity.builder()
            .id(1L).auth0Id("auth0|1").email("user@example.com").pseudo("user")
            .firstName("First").lastName("Last").pictureUrl("picture").phoneNumber("phone")
            .active(true).createdAt(now).lastUpdate(now).build();
    }
}
