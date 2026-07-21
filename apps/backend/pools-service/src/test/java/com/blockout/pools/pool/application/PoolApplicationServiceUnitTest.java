package com.blockout.pools.pool.application;

import com.blockout.pools.pool.application.commands.CreatePoolCommand;
import com.blockout.pools.pool.application.commands.UpdatePoolCommand;
import com.blockout.pools.pool.application.models.Format;
import com.blockout.pools.pool.application.models.Gender;
import com.blockout.pools.pool.application.ports.PoolEventPublisher;
import com.blockout.pools.pool.infrastructure.persistence.entities.PoolEntity;
import com.blockout.pools.pool.infrastructure.persistence.repositories.PoolRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Verifies Pool use cases with outbound adapters isolated.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Pool application service")
class PoolApplicationServiceUnitTest {
    @Mock
    PoolRepository repository;
    @Mock
    PoolEventPublisher publisher;
    PoolApplicationService service;

    @BeforeEach
    void setUp() {
        service = new PoolApplicationService(repository, publisher);
        lenient().when(repository.saveAndFlush(any(PoolEntity.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    @DisplayName("creates defaults and publishes the Pool search projection")
    void createsDefaultsAndPublishes() {
        var created = service.createPool(new CreatePoolCommand(
            "A", "LNV", "2026/2027", "League", "RAW", "Pool", "P", 2L,
            Format.SIX, Gender.F, null, null));
        assertThat(created.followersCount()).isZero();
        assertThat(created.active()).isTrue();
        verify(publisher).publishPoolUpsert(created);
    }

    @Test
    @DisplayName("updates mutable fields and clamps follower decrements")
    void updatesAndClampsFollowers() {
        PoolEntity pool = PoolEntity.builder().id(1L).poolCode("A").leagueCode("LNV").season("2026/2027")
            .name("Old").divisionId(2L).followersCount(0L).active(true).build();
        when(repository.findById(1L)).thenReturn(Optional.of(pool));
        var updated = service.updatePool(1L, new UpdatePoolCommand(
            null, null, null, null, null, "New", null, null, null, null, false));
        assertThat(updated.name()).isEqualTo("New");
        assertThat(updated.active()).isFalse();
        assertThat(service.decrementFollowersCount(1L, 9L).followersCount()).isZero();
    }
}
