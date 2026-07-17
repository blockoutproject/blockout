package com.blockout.matches.match.live.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.matches.match.live.persistence.MatchLiveLinkPersistenceMapper;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.repositories.MatchRepository;
import com.blockout.matches.services.moderation.MatchLiveLinkModerationPolicy;
import com.blockout.shared.model.LiveLinkStatusEnum;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;

class MatchLiveLinkApplicationServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-17T10:00:00Z");
    private static final CurrentUserSnapshot OWNER =
            new CurrentUserSnapshot("auth0|owner", NOW.minus(8, ChronoUnit.DAYS));
    private final MatchLiveLinkPersistenceMapper mapper = Mappers.getMapper(MatchLiveLinkPersistenceMapper.class);

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void upcomingUpsertCreatesAnActiveVersionAndPublishesAfterPersistence() {
        List<String> order = new ArrayList<>();
        MatchRepositoryDouble matches = new MatchRepositoryDouble(match(MatchStatus.UPCOMING));
        LiveLinkRepositoryDouble links = new LiveLinkRepositoryDouble(order);
        EventsDouble events = new EventsDouble(order);

        MatchLiveLinkResultView result = service(matches, links, OWNER, events)
                .upsert(1L, new UpsertMatchLiveLinkCommand("https://www.youtube.com/watch?v=abc"));

        assertThat(result.status()).isEqualTo(LiveLinkStatusEnum.ACTIVE);
        assertThat(result.provider().getValue()).isEqualTo("YOUTUBE");
        assertThat(result.ownerAuth0Id()).isEqualTo("auth0|owner");
        assertThat(order).containsExactly("save-live", "publish");
        assertThat(events.published).isOne();
    }

    @Test
    void unchangedOwnedActiveLinkIsANoOpBeforeQuotaChecks() {
        Match match = match(MatchStatus.UPCOMING);
        LiveLinkRepositoryDouble links = new LiveLinkRepositoryDouble();
        links.active = link(10L, match, "auth0|owner", LiveLinkStatus.ACTIVE,
                "https://youtu.be/abc", NOW.minusSeconds(10));
        links.ownerLinkCount = 99;

        MatchLiveLinkResultView result = service(
                new MatchRepositoryDouble(match), links, OWNER, new EventsDouble())
                .upsert(1L, new UpsertMatchLiveLinkCommand("https://youtu.be/abc"));

        assertThat(result.matchId()).isEqualTo(1L);
        assertThat(links.saved).isZero();
    }

    @Test
    void finishedNonModeratorFlowExpiresPriorVersionsAndCreatesPendingWithoutEvent() {
        Match match = match(MatchStatus.FINISHED);
        LiveLinkRepositoryDouble links = new LiveLinkRepositoryDouble();
        links.active = link(10L, match, "auth0|owner", LiveLinkStatus.ACTIVE,
                "https://youtu.be/old", NOW.minusSeconds(20));
        links.lastOwner = links.active;
        MatchLiveLink previousPending = link(11L, match, "auth0|owner", LiveLinkStatus.PENDING,
                "https://youtu.be/pending", NOW.minusSeconds(10));
        links.pending = List.of(previousPending);
        EventsDouble events = new EventsDouble();

        MatchLiveLinkResultView result = service(new MatchRepositoryDouble(match), links, OWNER, events)
                .upsert(1L, new UpsertMatchLiveLinkCommand("https://twitch.tv/blockout"));

        assertThat(result.status()).isEqualTo(LiveLinkStatusEnum.PENDING);
        assertThat(links.active.getStatus()).isEqualTo(LiveLinkStatus.EXPIRED);
        assertThat(previousPending.getStatus()).isEqualTo(LiveLinkStatus.EXPIRED);
        assertThat(events.published).isZero();
    }

    @Test
    void quotaAndProviderPoliciesRemainEnforced() {
        Match match = match(MatchStatus.UPCOMING);
        LiveLinkRepositoryDouble links = new LiveLinkRepositoryDouble();
        links.ownerLinkCount = 3;
        MatchLiveLinkApplicationService service = service(
                new MatchRepositoryDouble(match), links, OWNER, new EventsDouble());

        assertThatThrownBy(() -> service.upsert(1L, new UpsertMatchLiveLinkCommand("https://youtube.com/a")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("trop de versions");
        assertThatThrownBy(() -> service.upsert(1L, new UpsertMatchLiveLinkCommand("https://youtube.com.evil/a")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("YouTube, Twitch ou Facebook");
    }

    @Test
    void professionalLeagueAndYoungAccountRulesRemainEnforced() {
        Match professional = match(MatchStatus.UPCOMING);
        professional.setLeagueCode("aalnv");
        MatchLiveLinkApplicationService professionalService = service(
                new MatchRepositoryDouble(professional), new LiveLinkRepositoryDouble(), OWNER, new EventsDouble());
        CurrentUserSnapshot young = new CurrentUserSnapshot("auth0|young", NOW.minus(6, ChronoUnit.DAYS));
        MatchLiveLinkApplicationService youngService = service(
                new MatchRepositoryDouble(match(MatchStatus.UPCOMING)), new LiveLinkRepositoryDouble(), young,
                new EventsDouble());

        assertThatThrownBy(() -> professionalService.upsert(
                1L, new UpsertMatchLiveLinkCommand("https://youtube.com/a")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("professionnels");
        assertThatThrownBy(() -> youngService.upsert(
                1L, new UpsertMatchLiveLinkCommand("https://youtube.com/a")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("au moins 7 jours");
    }

    @Test
    void deleteIsAnAbsentNoOpAndStillEnforcesOwnerPermission() {
        Match match = match(MatchStatus.UPCOMING);
        LiveLinkRepositoryDouble links = new LiveLinkRepositoryDouble();
        MatchLiveLinkApplicationService service = service(
                new MatchRepositoryDouble(match), links, OWNER, new EventsDouble());

        service.delete(1L, "auth0|owner");
        assertThat(links.saved).isZero();

        links.active = link(10L, match, "auth0|other", LiveLinkStatus.ACTIVE,
                "https://youtu.be/a", NOW.minusSeconds(5));
        assertThatThrownBy(() -> service.delete(1L, "auth0|owner"))
                .isInstanceOf(AccessDeniedException.class);

        service.delete(1L, "auth0|other");
        assertThat(links.active.getStatus()).isEqualTo(LiveLinkStatus.DEACTIVATED);
        assertThat(links.active.getLastUpdate()).isEqualTo(NOW);
    }

    @Test
    void canonicalAndLegacyHistoryKeepNewestFirstDataAndExactPageMetadata() {
        Match match = match(MatchStatus.UPCOMING);
        MatchLiveLink newest = link(12L, match, "auth0|owner", LiveLinkStatus.ACTIVE,
                "https://youtu.be/new", NOW);
        MatchLiveLink older = link(11L, match, "auth0|owner", LiveLinkStatus.EXPIRED,
                "https://youtu.be/old", NOW.minusSeconds(60));
        LiveLinkRepositoryDouble links = new LiveLinkRepositoryDouble();
        links.history = List.of(newest, older);
        links.page = new PageImpl<>(List.of(newest), PageRequest.of(0, 1), 2);
        MatchLiveLinkApplicationService service = service(
                new MatchRepositoryDouble(match), links, OWNER, new EventsDouble());

        MatchLiveLinkHistoryPage page = service.findHistory(1L, 0, 1);
        List<MatchLiveLinkHistoryItemView> all = service.findAllHistory(1L);

        assertThat(page.items()).extracting(MatchLiveLinkHistoryItemView::id).containsExactly(12L);
        assertThat(page.totalItems()).isEqualTo(2);
        assertThat(page.hasNext()).isTrue();
        assertThat(all).extracting(MatchLiveLinkHistoryItemView::id).containsExactly(12L, 11L);
    }

    private MatchLiveLinkApplicationService service(
            MatchRepositoryDouble matches,
            LiveLinkRepositoryDouble links,
            CurrentUserSnapshot user,
            EventsDouble events) {
        return new MatchLiveLinkApplicationService(matches.proxy(), links.proxy(), () -> user,
                new MatchLiveLinkModerationPolicy(), events, mapper, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static Match match(MatchStatus status) {
        return Match.builder().id(1L).matchCode("M1").leagueCode("L1").poolId(9L).teamIdA(10L).teamIdB(11L)
                .matchDate(NOW.minusSeconds(60)).season("2026").status(status).active(true)
                .createdAt(NOW.minusSeconds(100)).lastUpdate(NOW.minusSeconds(50)).build();
    }

    private static MatchLiveLink link(
            long id, Match match, String owner, LiveLinkStatus status, String url, Instant createdAt) {
        return MatchLiveLink.builder().id(id).match(match).ownerAuth0Id(owner).provider(LiveProvider.YOUTUBE)
                .url(url).status(status).reportCount(0).createdAt(createdAt).lastUpdate(createdAt).build();
    }

    private static final class MatchRepositoryDouble implements InvocationHandler {
        private final Match match;
        private int saved;

        MatchRepositoryDouble(Match match) {
            this.match = match;
        }

        MatchRepository proxy() {
            return (MatchRepository) Proxy.newProxyInstance(
                    MatchRepository.class.getClassLoader(), new Class<?>[]{MatchRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "findById" -> Optional.ofNullable(match);
                case "save" -> {
                    saved++;
                    yield arguments[0];
                }
                case "toString" -> "MatchRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }

    private static final class LiveLinkRepositoryDouble implements InvocationHandler {
        private MatchLiveLink active;
        private MatchLiveLink lastOwner;
        private List<MatchLiveLink> pending = List.of();
        private List<MatchLiveLink> history = List.of();
        private Page<MatchLiveLink> page = Page.empty();
        private long ownerLinkCount;
        private long ownerMatchCountToday;
        private int saved;
        private long nextId = 100;
        private final List<String> order;

        LiveLinkRepositoryDouble() {
            this(new ArrayList<>());
        }

        LiveLinkRepositoryDouble(List<String> order) {
            this.order = order;
        }

        MatchLiveLinkRepository proxy() {
            return (MatchLiveLinkRepository) Proxy.newProxyInstance(
                    MatchLiveLinkRepository.class.getClassLoader(),
                    new Class<?>[]{MatchLiveLinkRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "findFirstByMatch_IdAndStatusOrderByCreatedAtDesc" -> Optional.ofNullable(active);
                case "findFirstByMatch_IdAndOwnerAuth0IdOrderByCreatedAtDesc" -> Optional.ofNullable(lastOwner);
                case "findByMatch_IdAndOwnerAuth0IdAndStatus" -> pending;
                case "countByMatch_IdAndOwnerAuth0Id" -> ownerLinkCount;
                case "countDistinctMatchesByOwnerAndDay" -> ownerMatchCountToday;
                case "save" -> {
                    MatchLiveLink link = (MatchLiveLink) arguments[0];
                    if (link.getId() == null) {
                        link.setId(nextId++);
                    }
                    saved++;
                    order.add("save-live");
                    yield link;
                }
                case "saveAll" -> arguments[0];
                case "findByMatch_IdOrderByCreatedAtDescIdDesc" ->
                    arguments.length == 1 ? history : page;
                case "toString" -> "MatchLiveLinkRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
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
