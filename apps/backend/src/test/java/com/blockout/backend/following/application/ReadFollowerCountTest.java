package com.blockout.backend.following.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Qualifies safe-integer bounds without manufacturing quadrillions of database rows. */
@DisplayName("Follower count transport bounds")
class ReadFollowerCountTest {
  @ParameterizedTest
  @ValueSource(longs = {0L, 9007199254740991L})
  @DisplayName("Preserves exact counts at the supported bounds")
  void supportsBounds(long count) {
    // Given
    Target target =
        new Target(TargetType.TEAM, UUID.fromString("00000000-0000-4000-8000-000000000227"));
    ReadSportingData sporting = mock(ReadSportingData.class);
    FollowReadStore store = mock(FollowReadStore.class);
    when(sporting.visibility(Kind.TEAM, target.id()))
        .thenReturn(Optional.of(new SportingVisibility(target.id(), Kind.TEAM, Set.of())));
    when(store.count(target)).thenReturn(count);
    ReadFollowerCount reads = new ReadFollowerCount(sporting, store);

    // When
    long observed = reads.read(target);

    // Then
    assertThat(observed).isEqualTo(count);
  }

  @ParameterizedTest
  @ValueSource(longs = {-1L, 9007199254740992L})
  @DisplayName("Rejects invalid storage counts instead of clamping or rounding")
  void rejectsInvalidCount(long count) {
    // Given
    Target target =
        new Target(TargetType.POOL, UUID.fromString("00000000-0000-4000-8000-000000000227"));
    ReadSportingData sporting = mock(ReadSportingData.class);
    FollowReadStore store = mock(FollowReadStore.class);
    when(sporting.visibility(Kind.POOL, target.id()))
        .thenReturn(Optional.of(new SportingVisibility(target.id(), Kind.POOL, Set.of())));
    when(store.count(target)).thenReturn(count);
    ReadFollowerCount reads = new ReadFollowerCount(sporting, store);

    // When / Then
    assertThatThrownBy(() -> reads.read(target)).isInstanceOf(IllegalStateException.class);
  }
}
