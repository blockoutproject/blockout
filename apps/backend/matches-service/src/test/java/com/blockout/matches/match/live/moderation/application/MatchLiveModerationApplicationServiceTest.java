package com.blockout.matches.match.live.moderation.application;

import com.blockout.shared.model.MatchLiveLinkDecisionEnum;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class MatchLiveModerationApplicationServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-17T10:00:00Z");

    @Test
    void statusFilterMatchesHistoryWhileRepresentativeKeepsPriorityAndPageOrder() {
        MatchLiveModerationLinkSnapshot newestRejected = link(11L, 1L, LiveLinkStatusEnum.REJECTED, NOW.minusSeconds(10));
        MatchLiveModerationLinkSnapshot newestActive = link(12L, 1L, LiveLinkStatusEnum.ACTIVE, NOW.minusSeconds(20));
        MatchLiveModerationLinkSnapshot olderRejected = link(21L, 2L, LiveLinkStatusEnum.REJECTED, NOW.minusSeconds(30));
        StoreDouble store = new StoreDouble(List.of(
                match(2L, NOW.minusSeconds(60), List.of(olderRejected)),
                match(1L, NOW, List.of(newestRejected, newestActive))));

        MatchLiveModerationPage first = service(store).findPage(
                new MatchLiveModerationQuery(LiveLinkStatusEnum.REJECTED, 0, 1));
        MatchLiveModerationPage second = service(store).findPage(
                new MatchLiveModerationQuery(LiveLinkStatusEnum.REJECTED, 1, 1));

        assertThat(first.items()).singleElement().satisfies(item -> {
            assertThat(item.id()).isEqualTo(1L);
            assertThat(item.lastLiveLinkId()).isEqualTo(12L);
            assertThat(item.lastLiveLinkStatus()).isEqualTo(LiveLinkStatusEnum.ACTIVE);
        });
        assertThat(first.totalItems()).isEqualTo(2);
        assertThat(first.hasNext()).isTrue();
        assertThat(second.items()).extracting(MatchLiveModerationView::id).containsExactly(2L);
        assertThat(second.hasNext()).isFalse();
    }

    @Test
    void approveExpiresTheCurrentActiveLinkAndActivatesPendingAtomically() {
        MatchLiveModerationLinkSnapshot pending = link(12L, 1L, LiveLinkStatusEnum.PENDING, NOW.minusSeconds(10));
        MatchLiveModerationLinkSnapshot active = link(11L, 1L, LiveLinkStatusEnum.ACTIVE, NOW.minusSeconds(20));
        StoreDouble store = new StoreDouble(List.of());
        store.byId.put(12L, pending);
        store.active = active;

        service(store).moderate(new ModerateMatchLiveLinkCommand(12L, MatchLiveLinkDecisionEnum.APPROVE));

        assertThat(store.changes).containsExactly(
                new StatusChange(11L, LiveLinkStatusEnum.EXPIRED, NOW),
                new StatusChange(12L, LiveLinkStatusEnum.ACTIVE, NOW));
        assertThat(store.touchedMatches).containsExactly(1L);
    }

    @Test
    void rejectRequiresPendingAndDoesNotPersistAnInvalidTransition() {
        StoreDouble store = new StoreDouble(List.of());
        store.byId.put(11L, link(11L, 1L, LiveLinkStatusEnum.ACTIVE, NOW));

        assertThatThrownBy(() -> service(store).moderate(
                new ModerateMatchLiveLinkCommand(11L, MatchLiveLinkDecisionEnum.REJECT)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Ce lien n'est pas en attente de validation.");
        assertThat(store.changes).isEmpty();
    }

    @Test
    void reactivateDeactivatesAnotherActiveLinkAndAcceptsEveryAuditedEligibleState() {
        for (LiveLinkStatusEnum eligible : List.of(
                LiveLinkStatusEnum.REJECTED,
                LiveLinkStatusEnum.EXPIRED,
                LiveLinkStatusEnum.DEACTIVATED,
                LiveLinkStatusEnum.BANNED)) {
            StoreDouble store = new StoreDouble(List.of());
            store.byId.put(12L, link(12L, 1L, eligible, NOW.minusSeconds(10)));
            store.active = link(11L, 1L, LiveLinkStatusEnum.ACTIVE, NOW.minusSeconds(20));

            service(store).moderate(new ModerateMatchLiveLinkCommand(12L, MatchLiveLinkDecisionEnum.REACTIVATE));

            assertThat(store.changes).containsExactly(
                    new StatusChange(11L, LiveLinkStatusEnum.DEACTIVATED, NOW),
                    new StatusChange(12L, LiveLinkStatusEnum.ACTIVE, NOW));
            assertThat(store.touchedMatches).containsExactly(1L);
        }
    }

    private MatchLiveModerationApplicationService service(StoreDouble store) {
        return new MatchLiveModerationApplicationService(
                store, new MatchLiveModerationPolicy(), new MatchLiveModerationProjector(),
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static MatchLiveModerationMatchSnapshot match(
            Long id,
            Instant matchDate,
            List<MatchLiveModerationLinkSnapshot> links) {
        return new MatchLiveModerationMatchSnapshot(
                id, "M" + id, "L1", 9L, 10L, 11L, matchDate, "2026", null, null,
                MatchStatusEnum.FINISHED, null, links);
    }

    private static MatchLiveModerationLinkSnapshot link(
            Long id,
            Long matchId,
            LiveLinkStatusEnum status,
            Instant createdAt) {
        return new MatchLiveModerationLinkSnapshot(
                id, matchId, status, LiveProviderEnum.YOUTUBE, "https://youtu.be/" + id,
                "auth0|owner", createdAt);
    }

    private record StatusChange(Long liveLinkId, LiveLinkStatusEnum status, Instant now) {
    }

    private static final class StoreDouble implements MatchLiveModerationStore {
        private final List<MatchLiveModerationMatchSnapshot> matches;
        private final Map<Long, MatchLiveModerationLinkSnapshot> byId = new HashMap<>();
        private final List<StatusChange> changes = new ArrayList<>();
        private final List<Long> touchedMatches = new ArrayList<>();
        private MatchLiveModerationLinkSnapshot active;

        StoreDouble(List<MatchLiveModerationMatchSnapshot> matches) {
            this.matches = matches;
        }

        @Override
        public List<MatchLiveModerationMatchSnapshot> findAllWithLiveLinks() {
            return matches;
        }

        @Override
        public Optional<MatchLiveModerationLinkSnapshot> findById(Long liveLinkId) {
            return Optional.ofNullable(byId.get(liveLinkId));
        }

        @Override
        public Optional<MatchLiveModerationLinkSnapshot> findNewestActive(Long matchId) {
            return Optional.ofNullable(active);
        }

        @Override
        public void changeStatus(Long liveLinkId, LiveLinkStatusEnum status, Instant now) {
            changes.add(new StatusChange(liveLinkId, status, now));
        }

        @Override
        public void touchMatch(Long matchId, Instant now) {
            touchedMatches.add(matchId);
        }
    }
}
