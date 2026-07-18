package com.blockout.matches.match.live.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

class MatchLiveLinkApplicationServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-17T10:00:00Z");
    private static final CurrentUserSnapshot OWNER =
            new CurrentUserSnapshot("auth0|owner", NOW.minus(8, ChronoUnit.DAYS));

    @Test
    void upcomingUpsertCreatesAnActiveVersionAndPublishesAfterPersistence() {
        List<String> order = new ArrayList<>();
        StoreDouble store = new StoreDouble(match(MatchStatusEnum.UPCOMING), order);
        EventsDouble events = new EventsDouble(order);

        MatchLiveLinkResultView result = service(store, OWNER, events)
                .upsert(1L, new UpsertMatchLiveLinkCommand("https://www.youtube.com/watch?v=abc"));

        assertThat(result.status()).isEqualTo(LiveLinkStatusEnum.ACTIVE);
        assertThat(result.provider()).isEqualTo(LiveProviderEnum.YOUTUBE);
        assertThat(result.ownerAuth0Id()).isEqualTo("auth0|owner");
        assertThat(order).containsExactly("save-live", "publish");
        assertThat(events.published).isOne();
    }

    @Test
    void unchangedOwnedActiveLinkIsANoOpBeforeQuotaChecks() {
        StoreDouble store = new StoreDouble(match(MatchStatusEnum.UPCOMING));
        store.active = link(10L, "auth0|owner", LiveLinkStatusEnum.ACTIVE,
                "https://youtu.be/abc", NOW.minusSeconds(10));
        store.ownerLinkCount = 99;

        MatchLiveLinkResultView result = service(store, OWNER, new EventsDouble())
                .upsert(1L, new UpsertMatchLiveLinkCommand("https://youtu.be/abc"));

        assertThat(result.matchId()).isEqualTo(1L);
        assertThat(store.created).isZero();
    }

    @Test
    void finishedNonModeratorFlowExpiresPriorVersionsAndCreatesPendingWithoutEvent() {
        StoreDouble store = new StoreDouble(match(MatchStatusEnum.FINISHED));
        store.active = link(10L, "auth0|owner", LiveLinkStatusEnum.ACTIVE,
                "https://youtu.be/old", NOW.minusSeconds(20));
        store.lastOwner = store.active;
        store.pending = List.of(link(11L, "auth0|owner", LiveLinkStatusEnum.PENDING,
                "https://youtu.be/pending", NOW.minusSeconds(10)));
        EventsDouble events = new EventsDouble();

        MatchLiveLinkResultView result = service(store, OWNER, events)
                .upsert(1L, new UpsertMatchLiveLinkCommand("https://twitch.tv/blockout"));

        assertThat(result.status()).isEqualTo(LiveLinkStatusEnum.PENDING);
        assertThat(store.changedStatuses).containsEntry(10L, LiveLinkStatusEnum.EXPIRED)
                .containsEntry(11L, LiveLinkStatusEnum.EXPIRED);
        assertThat(store.touched).isOne();
        assertThat(events.published).isZero();
    }

    @Test
    void quotaAndProviderPoliciesRemainEnforced() {
        StoreDouble store = new StoreDouble(match(MatchStatusEnum.UPCOMING));
        store.ownerLinkCount = 3;
        MatchLiveLinkApplicationService service = service(store, OWNER, new EventsDouble());

        assertThatThrownBy(() -> service.upsert(1L, new UpsertMatchLiveLinkCommand("https://youtube.com/a")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("trop de versions");
        assertThatThrownBy(() -> service.upsert(1L, new UpsertMatchLiveLinkCommand("https://youtube.com.evil/a")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("YouTube, Twitch ou Facebook");
    }

    @Test
    void professionalLeagueAndYoungAccountRulesRemainEnforced() {
        MatchLiveMatchSnapshot professional = new MatchLiveMatchSnapshot(
                1L, "aalnv", 10L, 11L, 9L, NOW.minusSeconds(60), MatchStatusEnum.UPCOMING);
        CurrentUserSnapshot young = new CurrentUserSnapshot("auth0|young", NOW.minus(6, ChronoUnit.DAYS));

        assertThatThrownBy(() -> service(new StoreDouble(professional), OWNER, new EventsDouble())
                .upsert(1L, new UpsertMatchLiveLinkCommand("https://youtube.com/a")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("professionnels");
        assertThatThrownBy(() -> service(
                new StoreDouble(match(MatchStatusEnum.UPCOMING)), young, new EventsDouble())
                .upsert(1L, new UpsertMatchLiveLinkCommand("https://youtube.com/a")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("au moins 7 jours");
    }

    @Test
    void deleteIsAnAbsentNoOpAndStillEnforcesOwnerPermission() {
        StoreDouble store = new StoreDouble(match(MatchStatusEnum.UPCOMING));
        MatchLiveLinkApplicationService service = service(store, OWNER, new EventsDouble());

        service.delete(1L, "auth0|owner");
        assertThat(store.changedStatuses).isEmpty();

        store.active = link(10L, "auth0|other", LiveLinkStatusEnum.ACTIVE,
                "https://youtu.be/a", NOW.minusSeconds(5));
        assertThatThrownBy(() -> service.delete(1L, "auth0|owner"))
                .isInstanceOf(AccessDeniedException.class);

        service.delete(1L, "auth0|other");
        assertThat(store.changedStatuses).containsEntry(10L, LiveLinkStatusEnum.DEACTIVATED);
    }

    @Test
    void canonicalAndLegacyHistoryKeepNewestFirstDataAndExactPageMetadata() {
        MatchLiveLinkSnapshot newest = link(12L, "auth0|owner", LiveLinkStatusEnum.ACTIVE,
                "https://youtu.be/new", NOW);
        MatchLiveLinkSnapshot older = link(11L, "auth0|owner", LiveLinkStatusEnum.EXPIRED,
                "https://youtu.be/old", NOW.minusSeconds(60));
        StoreDouble store = new StoreDouble(match(MatchStatusEnum.UPCOMING));
        store.history = List.of(newest, older);
        store.page = new MatchLiveLinkStatePage(List.of(newest), 2, true);
        MatchLiveLinkHistoryService history = new MatchLiveLinkHistoryService(store, new MatchLiveLinkProjector());

        MatchLiveLinkHistoryPage page = history.findHistory(1L, 0, 1);
        List<MatchLiveLinkHistoryItemView> all = history.findAllHistory(1L);

        assertThat(page.items()).extracting(MatchLiveLinkHistoryItemView::id).containsExactly(12L);
        assertThat(page.totalItems()).isEqualTo(2);
        assertThat(page.hasNext()).isTrue();
        assertThat(all).extracting(MatchLiveLinkHistoryItemView::id).containsExactly(12L, 11L);
    }

    private MatchLiveLinkApplicationService service(
            StoreDouble store, CurrentUserSnapshot user, EventsDouble events) {
        return new MatchLiveLinkApplicationService(
                store,
                () -> user,
                () -> false,
                new MatchLiveLinkPolicy(),
                new MatchLiveLinkStatePolicy(),
                new MatchLiveProviderResolver(),
                new MatchLiveLinkProjector(),
                events,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static MatchLiveMatchSnapshot match(MatchStatusEnum status) {
        return new MatchLiveMatchSnapshot(1L, "L1", 10L, 11L, 9L, NOW.minusSeconds(60), status);
    }

    private static MatchLiveLinkSnapshot link(
            long id, String owner, LiveLinkStatusEnum status, String url, Instant createdAt) {
        return new MatchLiveLinkSnapshot(
                id, 1L, LiveProviderEnum.YOUTUBE, url, status, 0, owner, createdAt, createdAt);
    }

    private static final class StoreDouble implements MatchLiveLinkStore, MatchLiveLinkHistoryStore {
        private final MatchLiveMatchSnapshot match;
        private final List<String> order;
        private MatchLiveLinkSnapshot active;
        private MatchLiveLinkSnapshot lastOwner;
        private List<MatchLiveLinkSnapshot> pending = List.of();
        private List<MatchLiveLinkSnapshot> history = List.of();
        private MatchLiveLinkStatePage page = new MatchLiveLinkStatePage(List.of(), 0, false);
        private final java.util.Map<Long, LiveLinkStatusEnum> changedStatuses = new java.util.LinkedHashMap<>();
        private long ownerLinkCount;
        private long ownerMatchCountToday;
        private int created;
        private int touched;
        private long nextId = 100;

        StoreDouble(MatchLiveMatchSnapshot match) {
            this(match, new ArrayList<>());
        }

        StoreDouble(MatchLiveMatchSnapshot match, List<String> order) {
            this.match = match;
            this.order = order;
        }

        @Override
        public Optional<MatchLiveMatchSnapshot> findMatch(Long matchId) {
            return Optional.ofNullable(match);
        }

        @Override
        public Optional<MatchLiveLinkSnapshot> findNewestActive(Long matchId) {
            return Optional.ofNullable(active);
        }

        @Override
        public Optional<MatchLiveLinkSnapshot> findLatestByOwner(Long matchId, String ownerAuth0Id) {
            return Optional.ofNullable(lastOwner);
        }

        @Override
        public long countByOwner(Long matchId, String ownerAuth0Id) {
            return ownerLinkCount;
        }

        @Override
        public long countDistinctMatchesByOwnerAndDay(String ownerAuth0Id, Instant start, Instant end) {
            return ownerMatchCountToday;
        }

        @Override
        public MatchLiveLinkSnapshot create(NewMatchLiveLink liveLink) {
            created++;
            order.add("save-live");
            return new MatchLiveLinkSnapshot(
                    nextId++, liveLink.matchId(), liveLink.provider(), liveLink.url(), liveLink.status(), 0,
                    liveLink.ownerAuth0Id(), liveLink.now(), liveLink.now());
        }

        @Override
        public void changeStatus(Long liveLinkId, LiveLinkStatusEnum status, Instant now) {
            changedStatuses.put(liveLinkId, status);
        }

        @Override
        public void changePendingByOwner(
                Long matchId, String ownerAuth0Id, LiveLinkStatusEnum status, Instant now) {
            pending.forEach(link -> changedStatuses.put(link.id(), status));
        }

        @Override
        public void touchMatch(Long matchId, Instant now) {
            touched++;
        }

        @Override
        public MatchLiveLinkStatePage findHistory(Long matchId, int page, int pageSize) {
            return this.page;
        }

        @Override
        public List<MatchLiveLinkSnapshot> findAllHistory(Long matchId) {
            return history;
        }
    }

    private static final class EventsDouble implements MatchLiveLinkEvents {
        private final List<String> order;
        private int published;

        EventsDouble() {
            this(new ArrayList<>());
        }

        EventsDouble(List<String> order) {
            this.order = order;
        }

        @Override
        public void publishMatchLiveLinkCreated(MatchLiveLinkCreatedEventInput event) {
            published++;
            order.add("publish");
        }
    }
}
