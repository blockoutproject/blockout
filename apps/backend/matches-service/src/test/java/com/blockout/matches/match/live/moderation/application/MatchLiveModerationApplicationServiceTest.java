package com.blockout.matches.match.live.moderation.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.matches.match.live.moderation.persistence.MatchLiveModerationPersistenceMapper;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.repositories.MatchRepository;
import com.blockout.shared.model.LiveLinkStatusEnum;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class MatchLiveModerationApplicationServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-17T10:00:00Z");
    private final MatchLiveModerationPersistenceMapper mapper =
            Mappers.getMapper(MatchLiveModerationPersistenceMapper.class);

    @Test
    void statusFilterMatchesHistoryWhileRepresentativeKeepsPriorityAndPageOrder() {
        Match newest = match(1L, NOW, List.of());
        Match older = match(2L, NOW.minusSeconds(60), List.of());
        MatchLiveLink newestRejected = link(11L, newest, LiveLinkStatus.REJECTED, NOW.minusSeconds(10));
        MatchLiveLink newestActive = link(12L, newest, LiveLinkStatus.ACTIVE, NOW.minusSeconds(20));
        MatchLiveLink olderRejected = link(21L, older, LiveLinkStatus.REJECTED, NOW.minusSeconds(30));
        newest.setLiveLinks(List.of(newestRejected, newestActive));
        older.setLiveLinks(List.of(olderRejected));
        MatchRepositoryDouble matches = new MatchRepositoryDouble(List.of(older, newest));
        LiveLinkRepositoryDouble liveLinks = new LiveLinkRepositoryDouble();
        MatchLiveModerationApplicationService service = service(matches, liveLinks);

        MatchLiveModerationPage first = service.findPage(
                new MatchLiveModerationQuery(LiveLinkStatusEnum.REJECTED, 0, 1));
        MatchLiveModerationPage second = service.findPage(
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
        Match match = match(1L, NOW, List.of());
        MatchLiveLink pending = link(12L, match, LiveLinkStatus.PENDING, NOW.minusSeconds(10));
        MatchLiveLink active = link(11L, match, LiveLinkStatus.ACTIVE, NOW.minusSeconds(20));
        MatchRepositoryDouble matches = new MatchRepositoryDouble(List.of(match));
        LiveLinkRepositoryDouble liveLinks = new LiveLinkRepositoryDouble();
        liveLinks.byId.put(12L, pending);
        liveLinks.active = active;

        service(matches, liveLinks).moderate(
                new ModerateMatchLiveLinkCommand(12L, MatchLiveLinkDecision.APPROVE));

        assertThat(active.getStatus()).isEqualTo(LiveLinkStatus.EXPIRED);
        assertThat(pending.getStatus()).isEqualTo(LiveLinkStatus.ACTIVE);
        assertThat(active.getLastUpdate()).isEqualTo(NOW);
        assertThat(pending.getLastUpdate()).isEqualTo(NOW);
        assertThat(match.getLastUpdate()).isEqualTo(NOW);
        assertThat(liveLinks.saved).containsExactly(active, pending);
        assertThat(matches.saved).containsExactly(match);
    }

    @Test
    void rejectRequiresPendingAndDoesNotPersistAnInvalidTransition() {
        MatchLiveLink active = link(11L, match(1L, NOW, List.of()), LiveLinkStatus.ACTIVE, NOW);
        MatchRepositoryDouble matches = new MatchRepositoryDouble(List.of(active.getMatch()));
        LiveLinkRepositoryDouble liveLinks = new LiveLinkRepositoryDouble();
        liveLinks.byId.put(11L, active);

        assertThatThrownBy(() -> service(matches, liveLinks).moderate(
                new ModerateMatchLiveLinkCommand(11L, MatchLiveLinkDecision.REJECT)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Ce lien n'est pas en attente de validation.");
        assertThat(liveLinks.saved).isEmpty();
    }

    @Test
    void reactivateDeactivatesAnotherActiveLinkAndAcceptsEveryAuditedEligibleState() {
        for (LiveLinkStatus eligible : List.of(
                LiveLinkStatus.REJECTED,
                LiveLinkStatus.EXPIRED,
                LiveLinkStatus.DEACTIVATED,
                LiveLinkStatus.BANNED)) {
            Match match = match(1L, NOW.minusSeconds(100), List.of());
            MatchLiveLink candidate = link(12L, match, eligible, NOW.minusSeconds(10));
            MatchLiveLink active = link(11L, match, LiveLinkStatus.ACTIVE, NOW.minusSeconds(20));
            MatchRepositoryDouble matches = new MatchRepositoryDouble(List.of(match));
            LiveLinkRepositoryDouble liveLinks = new LiveLinkRepositoryDouble();
            liveLinks.byId.put(12L, candidate);
            liveLinks.active = active;

            service(matches, liveLinks).moderate(
                    new ModerateMatchLiveLinkCommand(12L, MatchLiveLinkDecision.REACTIVATE));

            assertThat(active.getStatus()).isEqualTo(LiveLinkStatus.DEACTIVATED);
            assertThat(candidate.getStatus()).isEqualTo(LiveLinkStatus.ACTIVE);
            assertThat(match.getLastUpdate()).isEqualTo(NOW);
        }
    }

    private MatchLiveModerationApplicationService service(
            MatchRepositoryDouble matches,
            LiveLinkRepositoryDouble liveLinks) {
        return new MatchLiveModerationApplicationService(
                matches.proxy(), liveLinks.proxy(), mapper, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static Match match(Long id, Instant matchDate, List<MatchLiveLink> links) {
        return Match.builder().id(id).matchCode("M" + id).leagueCode("L1").poolId(9L)
                .teamIdA(10L).teamIdB(11L).matchDate(matchDate).season("2026")
                .status(MatchStatus.FINISHED).active(true).createdAt(NOW.minusSeconds(200))
                .lastUpdate(NOW.minusSeconds(100)).liveLinks(links).build();
    }

    private static MatchLiveLink link(Long id, Match match, LiveLinkStatus status, Instant createdAt) {
        return MatchLiveLink.builder().id(id).match(match).ownerAuth0Id("auth0|owner")
                .provider(LiveProvider.YOUTUBE).url("https://youtu.be/" + id).status(status)
                .reportCount(0).createdAt(createdAt).lastUpdate(createdAt).build();
    }

    private static final class MatchRepositoryDouble implements InvocationHandler {
        private final List<Match> all;
        private final List<Match> saved = new ArrayList<>();

        MatchRepositoryDouble(List<Match> all) {
            this.all = all;
        }

        MatchRepository proxy() {
            return (MatchRepository) Proxy.newProxyInstance(
                    MatchRepository.class.getClassLoader(), new Class<?>[]{MatchRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "findAllWithLiveLinks" -> all;
                case "save" -> {
                    saved.add((Match) arguments[0]);
                    yield arguments[0];
                }
                case "toString" -> "MatchRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }

    private static final class LiveLinkRepositoryDouble implements InvocationHandler {
        private final Map<Long, MatchLiveLink> byId = new HashMap<>();
        private final List<MatchLiveLink> saved = new ArrayList<>();
        private MatchLiveLink active;

        MatchLiveLinkRepository proxy() {
            return (MatchLiveLinkRepository) Proxy.newProxyInstance(
                    MatchLiveLinkRepository.class.getClassLoader(),
                    new Class<?>[]{MatchLiveLinkRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "findById" -> Optional.ofNullable(byId.get(arguments[0]));
                case "findFirstByMatch_IdAndStatusOrderByCreatedAtDesc" -> Optional.ofNullable(active);
                case "save" -> {
                    saved.add((MatchLiveLink) arguments[0]);
                    yield arguments[0];
                }
                case "toString" -> "LiveLinkRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }
}
