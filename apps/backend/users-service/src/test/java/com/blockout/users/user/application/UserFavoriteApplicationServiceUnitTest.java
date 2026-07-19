package com.blockout.users.user.application;

import com.blockout.users.user.application.models.EntityType;
import com.blockout.users.user.application.models.FollowEventType;
import com.blockout.users.user.application.ports.FollowerCounter;
import com.blockout.users.user.application.ports.UserFollowPublisher;
import com.blockout.users.user.infrastructure.persistence.entities.UserEntity;
import com.blockout.users.user.infrastructure.persistence.entities.UserFavoriteEntity;
import com.blockout.users.user.infrastructure.persistence.repositories.UserFavoriteRepository;
import com.blockout.users.user.infrastructure.persistence.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("User favorite application service")
class UserFavoriteApplicationServiceUnitTest {

    @Mock
    private UserFavoriteRepository favoriteRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserFollowPublisher publisher;
    @Mock
    private FollowerCounter followerCounter;

    private UserFavoriteApplicationService service;
    private UserEntity user;

    @BeforeEach
    void setUp() {
        service = new UserFavoriteApplicationService(
                favoriteRepository, userRepository, publisher, followerCounter);
        user = UserEntity.builder().id(1L).auth0Id("auth0|1").build();
    }

    @Test
    @DisplayName("creates one favorite, updates its owner counter, and publishes the established event")
    void followsEntity() {
        when(userRepository.findByAuth0Id("auth0|1")).thenReturn(Optional.of(user));
        when(favoriteRepository.existsByUserAndEntityTypeAndEntityId(user, EntityType.TEAM, 2L)).thenReturn(false);
        when(favoriteRepository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> {
            UserFavoriteEntity favorite = invocation.getArgument(0);
            favorite.setId(3L);
            return favorite;
        });

        service.follow("auth0|1", EntityType.TEAM, 2L);

        verify(followerCounter).increment(EntityType.TEAM, 2L, 1L);
        verify(publisher).publish(1L, EntityType.TEAM, 2L, FollowEventType.CREATED);
    }

    @Test
    @DisplayName("keeps an already followed entity idempotent")
    void existingFavoriteIsIdempotent() {
        when(userRepository.findByAuth0Id("auth0|1")).thenReturn(Optional.of(user));
        when(favoriteRepository.existsByUserAndEntityTypeAndEntityId(user, EntityType.POOL, 2L)).thenReturn(true);

        service.follow("auth0|1", EntityType.POOL, 2L);

        verify(followerCounter, never()).increment(EntityType.POOL, 2L, 1L);
        verify(publisher, never()).publish(1L, EntityType.POOL, 2L, FollowEventType.CREATED);
    }
}
