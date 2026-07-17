package com.blockout.matches.match.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.matches.match.persistence.MatchPersistenceMapper;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveProvider;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.repositories.MatchRepository;
import com.blockout.shared.model.MatchStatusEnum;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

class MatchApplicationServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-17T10:00:00Z");
    private final MatchPersistenceMapper mapper = Mappers.getMapper(MatchPersistenceMapper.class);

    @Test
    void createOwnsIdentityLifecycleAndStatusDerivedFromSetNullness() {
        RepositoryDouble repository = new RepositoryDouble();
        MatchApplicationService service = service(repository, new LiveLinkRepositoryDouble(), new EventsDouble());

        MatchSnapshot upcoming = service.create(command(null));
        MatchSnapshot finished = service.create(command("3-1"));

        assertThat(upcoming.status()).isEqualTo(MatchStatusEnum.UPCOMING);
        assertThat(finished.status()).isEqualTo(MatchStatusEnum.FINISHED);
        assertThat(upcoming.active()).isTrue();
        assertThat(upcoming.id()).isEqualTo(1L);
    }

    @Test
    void legacyCreateRetainsTheExplicitInactiveCompatibilityValue() {
        RepositoryDouble repository = new RepositoryDouble();
        MatchApplicationService service = service(repository, new LiveLinkRepositoryDouble(), new EventsDouble());

        MatchSnapshot result = service.createLegacy(command(null), false);

        assertThat(result.active()).isFalse();
    }

    @Test
    void canonicalPageKeepsFiltersAndReturnsExactStableMetadata() {
        RepositoryDouble repository = new RepositoryDouble();
        PageRequest pageable = PageRequest.of(1, 2);
        repository.page = new PageImpl<>(
                List.of(entity(2L, MatchStatus.UPCOMING, true, NOW.plusSeconds(60))), pageable, 5);
        MatchApplicationService service = service(repository, new LiveLinkRepositoryDouble(), new EventsDouble());

        MatchPage result = service.findPage(
                new MatchQuery(9L, List.of(3L), MatchStatusEnum.UPCOMING, true), 1, 2);

        assertThat(result.items()).extracting(MatchSnapshot::id).containsExactly(2L);
        assertThat(result.totalItems()).isEqualTo(5);
        assertThat(result.hasNext()).isTrue();
        assertThat(repository.pageArguments).containsExactly(9L, MatchStatus.UPCOMING, true, List.of(3L), 1, pageable);
    }

    @Test
    void updateReactivatesAndPublishesFinishBeforeSavingOnlyForTheOneWayTransition() {
        List<String> order = new ArrayList<>();
        RepositoryDouble repository = new RepositoryDouble(order);
        EventsDouble events = new EventsDouble(order);
        repository.entity = entity(1L, MatchStatus.UPCOMING, false, NOW);
        MatchApplicationService service = service(repository, new LiveLinkRepositoryDouble(), events);

        MatchSnapshot result = service.update(1L, updateCommand("3-2"));

        assertThat(result.active()).isTrue();
        assertThat(result.status()).isEqualTo(MatchStatusEnum.FINISHED);
        assertThat(order).containsExactly("publish", "save");
    }

    @Test
    void updateNeverReversesFinishedStatusWhenTheReplacementSetBecomesNull() {
        RepositoryDouble repository = new RepositoryDouble();
        EventsDouble events = new EventsDouble();
        repository.entity = entity(1L, MatchStatus.FINISHED, true, NOW);
        repository.entity.setSet("3-0");
        MatchApplicationService service = service(repository, new LiveLinkRepositoryDouble(), events);

        MatchSnapshot result = service.update(1L, updateCommand(null));

        assertThat(result.status()).isEqualTo(MatchStatusEnum.FINISHED);
        assertThat(result.set()).isNull();
        assertThat(events.published).isZero();
    }

    @Test
    void bulkDeactivationUsesSetSemanticsAndKeepsEmptySelectionAsANoOp() {
        RepositoryDouble repository = new RepositoryDouble();
        MatchApplicationService service = service(repository, new LiveLinkRepositoryDouble(), new EventsDouble());
        DeactivateMatchesCommand command = DeactivateMatchesCommand.from(9L, List.of("M1", "M1"));

        service.deactivate(command);

        assertThat(command.missingMatchCodes()).containsExactly("M1").isUnmodifiable();
        assertThat(repository.savedAll).isZero();
    }

    @Test
    void upcomingDayPageUsesParisDaysPoolOrderingAndNewestActiveLink() {
        RepositoryDouble repository = new RepositoryDouble();
        LiveLinkRepositoryDouble links = new LiveLinkRepositoryDouble();
        LocalDate parisDay = LocalDate.of(2026, 7, 18);
        Match poolTwo = entity(2L, MatchStatus.UPCOMING, true, Instant.parse("2026-07-18T08:00:00Z"));
        poolTwo.setPoolId(2L);
        Match poolOne = entity(1L, MatchStatus.UPCOMING, true, Instant.parse("2026-07-18T07:00:00Z"));
        poolOne.setPoolId(1L);
        repository.days = List.of(parisDay);
        repository.range = List.of(poolTwo, poolOne);
        links.activeLinks = List.of(
                liveLink(poolOne, "https://old", NOW.minusSeconds(60)),
                liveLink(poolOne, "https://new", NOW));
        MatchApplicationService service = service(repository, links, new EventsDouble());

        MatchDayPage result = service.findDayPage(new MatchDayQuery(
                List.of(1L, 2L), List.of(), MatchStatusEnum.UPCOMING, 0, 4, true));

        assertThat(result.dayMatches()).extracting(MatchDayView::date).containsExactly(parisDay);
        assertThat(result.dayMatches().getFirst().pools()).extracting(MatchDayPoolView::poolId)
                .containsExactly(1L, 2L);
        assertThat(result.dayMatches().getFirst().pools().getFirst().matches().getFirst().liveUrl())
                .isEqualTo("https://new");
        assertThat(result.hasNext()).isFalse();
        assertThat(result.nextPage()).isNull();
    }

    @Test
    void filteredEmptyDayRangePreservesTheLegacyFalseHasNextAndNextPageOddity() {
        RepositoryDouble repository = new RepositoryDouble();
        repository.days = List.of(LocalDate.of(2026, 7, 17), LocalDate.of(2026, 7, 16));
        MatchApplicationService service = service(repository, new LiveLinkRepositoryDouble(), new EventsDouble());

        MatchDayPage result = service.findDayPage(new MatchDayQuery(
                List.of(1L), List.of(), MatchStatusEnum.FINISHED, 0, 1, false));

        assertThat(result.dayMatches()).isEmpty();
        assertThat(result.hasNext()).isFalse();
        assertThat(result.nextPage()).isEqualTo(1);
    }

    private MatchApplicationService service(
            RepositoryDouble repository, LiveLinkRepositoryDouble links, EventsDouble events) {
        return new MatchApplicationService(repository.proxy(), links.proxy(), events, mapper,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private CreateMatchCommand command(String set) {
        return new CreateMatchCommand("M1", "L1", 9L, null, 10L, 11L, NOW, "2026", set,
                null, null, null, null);
    }

    private UpdateMatchCommand updateCommand(String set) {
        return new UpdateMatchCommand("M1", "L1", 9L, null, 10L, 11L, NOW, "2026", set,
                null, null, null, null);
    }

    private static Match entity(long id, MatchStatus status, boolean active, Instant date) {
        return Match.builder().id(id).matchCode("M" + id).leagueCode("L1").poolId(9L).teamIdA(10L)
                .teamIdB(11L).matchDate(date).season("2026").status(status).active(active)
                .createdAt(NOW.minusSeconds(100)).lastUpdate(NOW.minusSeconds(50)).build();
    }

    private MatchLiveLink liveLink(Match match, String url, Instant createdAt) {
        return MatchLiveLink.builder().id(createdAt.getEpochSecond()).match(match).ownerAuth0Id("auth0|owner")
                .provider(LiveProvider.YOUTUBE).url(url)
                .status(com.blockout.matches.models.enums.LiveLinkStatus.ACTIVE).createdAt(createdAt).build();
    }

    private static final class RepositoryDouble implements InvocationHandler {
        private Match entity;
        private Page<Match> page = Page.empty();
        private List<LocalDate> days = List.of();
        private List<Match> range = List.of();
        private List<Object> pageArguments = List.of();
        private int savedAll;
        private final List<String> order;

        RepositoryDouble() {
            this(new ArrayList<>());
        }

        RepositoryDouble(List<String> order) {
            this.order = order;
        }

        MatchRepository proxy() {
            return (MatchRepository) Proxy.newProxyInstance(
                    MatchRepository.class.getClassLoader(), new Class<?>[]{MatchRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "save" -> {
                    entity = (Match) arguments[0];
                    if (entity.getId() == null) {
                        entity.setId(1L);
                        entity.setCreatedAt(NOW);
                        entity.setLastUpdate(NOW);
                    }
                    order.add("save");
                    yield entity;
                }
                case "findById" -> Optional.ofNullable(entity);
                case "findFilteredPage" -> {
                    pageArguments = List.of(arguments);
                    yield page;
                }
                case "findDistinctUpcomingDatesIncludingToday", "findDistinctDatesUntil" -> days;
                case "findAllInRangeAsc", "findAllInRangeDesc" -> range;
                case "findByActiveTrueAndPoolIdAndMatchCodeIn" -> List.of();
                case "saveAll" -> {
                    savedAll++;
                    yield arguments[0];
                }
                case "toString" -> "MatchRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }

    private static final class LiveLinkRepositoryDouble implements InvocationHandler {
        private List<MatchLiveLink> activeLinks = List.of();

        MatchLiveLinkRepository proxy() {
            return (MatchLiveLinkRepository) Proxy.newProxyInstance(
                    MatchLiveLinkRepository.class.getClassLoader(),
                    new Class<?>[]{MatchLiveLinkRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "findByMatchIdInAndStatus" -> activeLinks;
                case "findFirstByMatch_IdAndStatusOrderByCreatedAtDesc" -> Optional.empty();
                case "toString" -> "MatchLiveLinkRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }

    private static final class EventsDouble implements MatchLifecycleEvents {
        private final List<String> order;
        private int published;

        EventsDouble() {
            this(new ArrayList<>());
        }

        EventsDouble(List<String> order) {
            this.order = order;
        }

        @Override
        public void publishMatchFinished(MatchFinishedEventInput event) {
            published++;
            order.add("publish");
        }
    }
}
