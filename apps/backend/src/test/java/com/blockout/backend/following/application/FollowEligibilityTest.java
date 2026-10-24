package com.blockout.backend.following.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.FollowStore.Relation;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Detached F07 inputs; no notification delivery or audience history is exercised here. */
@DisplayName("Current follow eligibility")
class FollowEligibilityTest {
  private final FollowStore store = mock(FollowStore.class);
  private final FollowEligibility eligibility = new FollowEligibility(store);
  private final UUID account = UUID.randomUUID();
  private final Target home = new Target(TargetType.TEAM, UUID.randomUUID());
  private final Target away = new Target(TargetType.TEAM, UUID.randomUUID());
  private final Target pool = new Target(TargetType.POOL, UUID.randomUUID());

  @Test
  @DisplayName(
      "Unions overlapping team and pool origins once per account with all relation identities")
  void unionsRecipients() {
    // Given
    Relation homeFollow = new Relation(UUID.randomUUID(), account, home);
    Relation awayFollow = new Relation(UUID.randomUUID(), account, away);
    Relation poolFollow = new Relation(UUID.randomUUID(), account, pool);
    Relation other = new Relation(UUID.randomUUID(), UUID.randomUUID(), pool);
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
    Relation original = new Relation(UUID.randomUUID(), account, home);
    FollowContext context = new FollowContext(account, home);
    when(store.find(context))
        .thenReturn(
            Optional.of(original),
            Optional.empty(),
            Optional.of(new Relation(UUID.randomUUID(), account, home)));

    // When / Then
    assertThat(eligibility.stillPresent(original)).isTrue();
    assertThat(eligibility.stillPresent(original)).isFalse();
    assertThat(eligibility.stillPresent(original)).isFalse();
  }

  @Test
  @DisplayName(
      "Reads only exact sporting identities without a display season or a persisted audience")
  void readsCurrentRelationsEachTime() {
    // Given
    Relation historical = new Relation(UUID.randomUUID(), account, home);
    Set<Target> targets = Set.of(home);
    when(store.relations(targets)).thenReturn(List.of(historical), List.of());

    // When / Then
    assertThat(eligibility.recipients(targets)).containsEntry(account, Set.of(historical));
    assertThat(eligibility.recipients(targets)).isEmpty();
  }
}
