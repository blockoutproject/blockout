package com.blockout.matches.match.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.match.persistence.MatchPersistenceMapper;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.repositories.MatchRepository;
import com.blockout.matches.utils.DiffUtils;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MatchApplicationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchApplicationService.class);
    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final MatchRepository matches;
    private final MatchLiveLinkRepository liveLinks;
    private final MatchLifecycleEvents events;
    private final MatchPersistenceMapper mapper;
    private final Clock clock;

    @Transactional
    public MatchSnapshot create(CreateMatchCommand command) {
        return create(command, true);
    }

    @Transactional
    public MatchSnapshot createLegacy(CreateMatchCommand command, Boolean requestedActive) {
        return create(command, requestedActive == null || requestedActive);
    }

    private MatchSnapshot create(CreateMatchCommand command, boolean active) {
        Match match = mapper.toEntity(command);
        match.setStatus(command.set() == null ? MatchStatus.UPCOMING : MatchStatus.FINISHED);
        match.setActive(active);
        Match saved = matches.save(match);
        LOGGER.info("Match created successfully", keyValue("action", "create_match"),
                keyValue("matchId", saved.getId()));
        return mapper.toSnapshot(saved);
    }

    @Transactional(readOnly = true)
    public List<MatchSnapshot> findAll(MatchQuery query) {
        List<Long> teamIds = query.teamIds();
        return matches.findFiltered(
                query.poolId(), persistenceStatus(query.status()), query.active(), teamIds, teamIds.size()).stream()
                .map(mapper::toSnapshot)
                .toList();
    }

    @Transactional(readOnly = true)
    public MatchPage findPage(MatchQuery query, int page, int pageSize) {
        List<Long> teamIds = query.teamIds();
        Page<Match> result = matches.findFilteredPage(
                query.poolId(), persistenceStatus(query.status()), query.active(), teamIds, teamIds.size(),
                PageRequest.of(page, pageSize));
        return new MatchPage(result.getContent().stream().map(mapper::toSnapshot).toList(),
                page, pageSize, result.getTotalElements(), result.hasNext());
    }

    @Transactional(readOnly = true)
    public MatchDetailView findDetail(Long id) {
        Match match = findEntity(id);
        MatchLiveLink activeLink = liveLinks
                .findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(id, LiveLinkStatus.ACTIVE)
                .orElse(null);
        return detail(match, activeLink);
    }

    @Transactional(readOnly = true)
    public MatchDayPage findDayPage(MatchDayQuery query) {
        Instant now = clock.instant();
        LocalDate todayParis = LocalDate.now(clock.withZone(PARIS));
        MatchStatus status = persistenceStatus(query.status());

        List<LocalDate> allDays = status == MatchStatus.UPCOMING
                ? matches.findDistinctUpcomingDatesIncludingToday(
                        todayParis, query.poolIds(), query.poolIds().size(), query.teamIds(), query.teamIds().size())
                : matches.findDistinctDatesUntil(
                        now, query.poolIds(), query.poolIds().size(), query.teamIds(), query.teamIds().size());

        int fromIndex = query.page() * query.pageSize();
        if (fromIndex >= allDays.size()) {
            return new MatchDayPage(List.of(), false, null);
        }

        int toIndex = Math.min(fromIndex + query.pageSize(), allDays.size());
        List<LocalDate> selectedDays = allDays.subList(fromIndex, toIndex);
        LocalDate minDay = status == MatchStatus.UPCOMING
                ? selectedDays.getFirst()
                : selectedDays.getLast();
        LocalDate maxDay = status == MatchStatus.UPCOMING
                ? selectedDays.getLast()
                : selectedDays.getFirst();
        Instant start = minDay.atStartOfDay(PARIS).toInstant();
        Instant end = status == MatchStatus.UPCOMING
                ? maxDay.plusDays(1).atStartOfDay(PARIS).toInstant()
                : maxDay.equals(todayParis) ? now : maxDay.plusDays(1).atStartOfDay(PARIS).toInstant();

        List<Match> range = status == MatchStatus.UPCOMING
                ? matches.findAllInRangeAsc(start, end, query.poolIds(), query.poolIds().size(), status,
                        query.teamIds(), query.teamIds().size(), query.active())
                : matches.findAllInRangeDesc(start, end, query.poolIds(), query.poolIds().size(), status,
                        query.teamIds(), query.teamIds().size(), query.active());

        boolean hasNext = toIndex < allDays.size();
        Integer nextPage = hasNext ? query.page() + 1 : null;
        if (range.isEmpty()) {
            return new MatchDayPage(List.of(), false, nextPage);
        }

        Map<Long, MatchLiveLink> activeByMatch = newestActiveLinks(range);
        Map<LocalDate, List<Match>> matchesByDate = range.stream().collect(Collectors.groupingBy(
                match -> ZonedDateTime.ofInstant(match.getMatchDate(), PARIS).toLocalDate()));
        List<MatchDayView> days = selectedDays.stream()
                .map(day -> dayView(day, matchesByDate.getOrDefault(day, List.of()), activeByMatch))
                .toList();
        return new MatchDayPage(days, hasNext, nextPage);
    }

    @Transactional
    public MatchSnapshot update(Long id, UpdateMatchCommand command) {
        Match match = findEntity(id);
        Match before = match.toBuilder().build();
        mapper.replaceScraperFields(command, match);
        match.setActive(true);

        if (!before.getActive()) {
            LOGGER.info("Match reactivated", keyValue("matchId", id));
        }
        if (before.getStatus() == MatchStatus.UPCOMING && match.getSet() != null) {
            match.setStatus(MatchStatus.FINISHED);
            events.publishMatchFinished(new MatchFinishedEventInput(
                    match.getId(), match.getTeamIdA(), match.getTeamIdB(), match.getPoolId(), match.getSet()));
        }

        Match saved = matches.save(match);
        DiffUtils.logChanges(before, saved, LOGGER, "update_match", saved.getId());
        return mapper.toSnapshot(saved);
    }

    @Transactional
    public void deactivate(DeactivateMatchesCommand command) {
        LOGGER.info("Starting bulk match deactivation", keyValue("action", "bulk_deactivate_matches"),
                keyValue("poolId", command.poolId()), keyValue("matchCodesToDeactivate", command.missingMatchCodes()));
        List<Match> selected = matches.findByActiveTrueAndPoolIdAndMatchCodeIn(
                command.poolId(), command.missingMatchCodes());
        if (selected.isEmpty()) {
            LOGGER.info("No active matches selected for deactivation", keyValue("action", "bulk_deactivate_matches"),
                    keyValue("poolId", command.poolId()));
            return;
        }
        selected.forEach(match -> match.setActive(false));
        matches.saveAll(selected);
        LOGGER.info("Matches bulk deactivated", keyValue("action", "bulk_deactivate_matches"),
                keyValue("poolId", command.poolId()), keyValue("matchCount", selected.size()));
    }

    private Match findEntity(Long id) {
        return matches.findById(id).orElseThrow(() -> {
            LOGGER.warn("Match not found", keyValue("matchId", id));
            return new MatchNotFoundException(id);
        });
    }

    private Map<Long, MatchLiveLink> newestActiveLinks(List<Match> range) {
        List<Long> ids = range.stream().map(Match::getId).distinct().toList();
        return liveLinks.findByMatchIdInAndStatus(ids, LiveLinkStatus.ACTIVE).stream()
                .collect(Collectors.toMap(link -> link.getMatch().getId(), link -> link,
                        (left, right) -> left.getCreatedAt().isAfter(right.getCreatedAt()) ? left : right));
    }

    private MatchDayView dayView(
            LocalDate day, List<Match> matchesForDay, Map<Long, MatchLiveLink> activeByMatch) {
        Map<Long, List<Match>> byPool = matchesForDay.stream()
                .collect(Collectors.groupingBy(Match::getPoolId, TreeMap::new, Collectors.toList()));
        List<MatchDayPoolView> pools = byPool.entrySet().stream()
                .map(entry -> new MatchDayPoolView(entry.getKey(), entry.getValue().stream()
                        .map(match -> detail(match, activeByMatch.get(match.getId())))
                        .toList()))
                .toList();
        return new MatchDayView(day, pools);
    }

    private MatchDetailView detail(Match match, MatchLiveLink live) {
        MatchSnapshot snapshot = mapper.toSnapshot(match);
        return new MatchDetailView(snapshot.id(), snapshot.matchCode(), snapshot.leagueCode(), snapshot.poolId(),
                snapshot.liveCode(), snapshot.teamIdA(), snapshot.teamIdB(), snapshot.matchDate(), snapshot.season(),
                snapshot.set(), snapshot.score(), snapshot.status(), snapshot.venue(), snapshot.firstReferee(),
                snapshot.secondReferee(), live == null ? null : live.getUrl(),
                live == null ? null : LiveProviderEnum.fromValue(live.getProvider().name()),
                live == null ? null : live.getOwnerAuth0Id());
    }

    private MatchStatus persistenceStatus(MatchStatusEnum status) {
        return status == null ? null : MatchStatus.valueOf(status.getValue());
    }
}
