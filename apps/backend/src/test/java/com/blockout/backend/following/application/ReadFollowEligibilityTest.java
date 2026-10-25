package com.blockout.backend.following.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.backend.following.application.FollowContext.Relation;
import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
  @DisplayName(
      "Unions overlapping team and pool origins once per account with all relation identities")
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
    Map<UUID, Set<Relation>> recipients = eligibility.recipients(targets);

    // Then
    assertThat(recipients).hasSize(2);
    assertThat(recipients.get(account))
        .containsExactlyInAnyOrder(homeFollow, awayFollow, poolFollow);
    assertThat(recipients.get(other.accountId())).containsExactly(other);
    assertThatThrownBy(() -> recipients.clear()).isInstanceOf(UnsupportedOperationException.class);
    assertThatThrownBy(() -> recipients.get(account).clear())
        .isInstanceOf(UnsupportedOperationException.class);
  }

  @Test
  @DisplayName(
      "Keeps the same relation eligible while excluding its removed or recreated incarnation")
  void distinguishesRelationLifecycles() {
    // Given
    Relation original =
        new Relation(UUID.fromString("00000000-0000-4000-8000-000000000010"), account, home);
    FollowContext context = new FollowContext(account, home);
    when(store.find(context))
        .thenReturn(
            Optional.of(original),
            Optional.empty(),
            Optional.of(
                new Relation(
                    UUID.fromString("00000000-0000-4000-8000-000000000011"), account, home)));

    // When
    boolean retained = eligibility.stillPresent(original);
    boolean removed = eligibility.stillPresent(original);
    boolean recreated = eligibility.stillPresent(original);

    // Then
    assertThat(retained).isTrue();
    assertThat(removed).isFalse();
    assertThat(recreated).isFalse();
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
    Map<UUID, Set<Relation>> beforeRemoval = eligibility.recipients(targets);
    Map<UUID, Set<Relation>> afterRemoval = eligibility.recipients(targets);

    // Then
    assertThat(beforeRemoval).containsEntry(account, Set.of(historical));
    assertThat(afterRemoval).isEmpty();
  }
}
