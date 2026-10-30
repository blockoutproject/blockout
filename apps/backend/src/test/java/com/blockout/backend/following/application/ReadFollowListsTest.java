package com.blockout.backend.following.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.sporting.application.ReadSportingResources;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Exercises arithmetic refusals without manufacturing billions of persisted sporting rows. */
@DisplayName("Personal follow traversal bounds")
class ReadFollowListsTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000229");
  private final AccountAccess accounts = mock(AccountAccess.class);
  private final FollowReadStore follows = mock(FollowReadStore.class);
  private final ReadSportingResources sporting = mock(ReadSportingResources.class);
  private final ReadFollowLists lists = new ReadFollowLists(accounts, follows, sporting);

  @ParameterizedTest
  @ValueSource(longs = {-1, 107374183L, Long.MAX_VALUE})
  @DisplayName("Refuses an unsupported page before native offset conversion or persistence reads")
  void rejectsUnsupportedPage(long page) {
    // Given
    // The supplied page lies outside the canonical native offset range.

    // When
    ThrowingCallable teams = () -> lists.teams(ACCOUNT, null, page);
    ThrowingCallable pools = () -> lists.pools(ACCOUNT, null, page);

    // Then
    assertThatThrownBy(teams).isInstanceOf(FollowPageOutOfRangeException.class);
    assertThatThrownBy(pools).isInstanceOf(FollowPageOutOfRangeException.class);
    verifyNoInteractions(accounts, follows, sporting);
  }

  @ParameterizedTest
  @EnumSource(TargetType.class)
  @DisplayName("Refuses an unrepresentable continuation instead of presenting a false end")
  void rejectsUnrepresentableContinuation(TargetType type) {
    // Given
    List<UUID> fullPage =
        IntStream.rangeClosed(1, 20).mapToObj(index -> new UUID(0, index)).toList();
    when(accounts.exists(ACCOUNT)).thenReturn(true);
    when(follows.targets(ACCOUNT, type, null, 107374182L))
        .thenReturn(new FollowReadStore.TargetPage(fullPage, true));

    // When
    ThrowingCallable read =
        () -> {
          if (type == TargetType.TEAM) lists.teams(ACCOUNT, null, 107374182L);
          else lists.pools(ACCOUNT, null, 107374182L);
        };

    // Then
    assertThatThrownBy(read).isInstanceOf(FollowPageOutOfRangeException.class);
    verifyNoInteractions(sporting);
  }

  @Test
  @DisplayName("Keeps the maximum page valid when the selection is exhausted")
  void acceptsExhaustedMaximum() {
    // Given
    when(accounts.exists(ACCOUNT)).thenReturn(true);
    when(follows.targets(ACCOUNT, TargetType.TEAM, null, 107374182L))
        .thenReturn(new FollowReadStore.TargetPage(List.of(), false));

    // When
    ReadFollowLists.Teams result = lists.teams(ACCOUNT, null, 107374182L);

    // Then
    assertThat(result.items()).isEmpty();
    assertThat(result.nextPage()).isNull();
    verifyNoInteractions(sporting);
  }
}
