package com.blockout.backend.following.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.backend.following.application.FollowContext.Relation;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Detached F07 inputs; no notification delivery or audience history is exercised here. */
@DisplayName("Current follow eligibility")
class ReadFollowEligibilityTest {
  private final FollowStore store = mock(FollowStore.class);
  private final ReadFollowEligibility eligibility = new ReadFollowEligibility(store);
  private final UUID account = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private final Target home =
      new Target(TargetType.TEAM, UUID.fromString("00000000-0000-4000-8000-000000000002"));
  private final Target away =
      new Target(TargetType.TEAM, UUID.fromString("00000000-0000-4000-8000-000000000003"));
  private final Target pool =
      new Target(TargetType.POOL, UUID.fromString("00000000-0000-4000-8000-000000000004"));

  @Test
  @DisplayName("Unions overlapping team and pool origins once per account")
  void unionsRecipients() {
    // Given
    Relation homeFollow =
        new Relation(UUID.fromString("00000000-0000-4000-8000-000000000005"), account, home);
    Relation awayFollow =
        new Relation(UUID.fromString("00000000-0000-4000-8000-000000000006"), account, away);
    Relation poolFollow =
        new Relation(UUID.fromString("00000000-0000-4000-8000-000000000007"), account, pool);
    Relation other =
        new Relation(
            UUID.fromString("00000000-0000-4000-8000-000000000008"),
            UUID.fromString("00000000-0000-4000-8000-000000000009"),
            pool);
    Set<Target> targets = Set.of(home, away, pool);
    when(store.relations(targets)).thenReturn(List.of(homeFollow, awayFollow, poolFollow, other));

    // When
    Set<UUID> recipients = eligibility.recipients(targets);

    // Then
    assertThat(recipients).containsExactlyInAnyOrder(account, other.accountId());
    assertThatThrownBy(() -> recipients.clear()).isInstanceOf(UnsupportedOperationException.class);
  }

  @Test
  @DisplayName(
      "Reads only exact sporting identities without a display season or a persisted audience")
  void readsCurrentRelationsEachTime() {
    // Given
    Relation historical =
        new Relation(UUID.fromString("00000000-0000-4000-8000-000000000012"), account, home);
    Set<Target> targets = Set.of(home);
    when(store.relations(targets)).thenReturn(List.of(historical), List.of());

    // When
    Set<UUID> beforeRemoval = eligibility.recipients(targets);
    Set<UUID> afterRemoval = eligibility.recipients(targets);

    // Then
    assertThat(beforeRemoval).containsExactly(account);
    assertThat(afterRemoval).isEmpty();
  }
}
