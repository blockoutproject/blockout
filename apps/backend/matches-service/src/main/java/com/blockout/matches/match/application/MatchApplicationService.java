package com.blockout.matches.match.application;

import com.blockout.matches.match.application.commands.CreateMatchCommand;
import com.blockout.matches.match.application.commands.UpdateMatchCommand;
import com.blockout.matches.match.application.exceptions.MatchNotFoundException;
import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.application.models.MatchStatus;
import com.blockout.matches.match.application.ports.MatchEventPublisher;
import com.blockout.matches.match.application.views.*;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchEntity;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchLiveLinkEntity;
import com.blockout.matches.match.infrastructure.persistence.repositories.MatchLiveLinkRepository;
import com.blockout.matches.match.infrastructure.persistence.repositories.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class MatchApplicationService implements MatchService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchApplicationService.class);
    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final MatchRepository matchRepository;
    private final MatchLiveLinkRepository liveLinkRepository;
    private final MatchEventPublisher eventPublisher;

    @Override
    @Transactional(readOnly = true)
    public List<MatchView> findMatches(Long poolId, List<Long> teamIds, MatchStatus status, Boolean active) {
        List<Long> safeTeamIds = teamIds == null ? Collections.emptyList() : teamIds;
        List<MatchEntity> matches = matchRepository.findFiltered(
            poolId, status, active, safeTeamIds, safeTeamIds.size());
        return toViews(matches);
    }

    @Override
    @Transactional(readOnly = true)
    public DayPageView getMatchesByDay(List<Long> poolIds, List<Long> teamIds, MatchStatus status,
                                       int page, int size, Boolean active) {
        Instant now = Instant.now();
        LocalDate todayParis = LocalDate.now(PARIS);
        List<LocalDate> allDays = status == MatchStatus.UPCOMING
            ? matchRepository.findDistinctUpcomingDatesIncludingToday(
            todayParis, poolIds, poolIds.size(), teamIds, teamIds.size())
            : matchRepository.findDistinctDatesUntil(
            now, poolIds, poolIds.size(), teamIds, teamIds.size());

        int fromIndex = page * size;
        if (fromIndex >= allDays.size()) {
            return new DayPageView(List.of(), false, null);
        }

        int toIndex = Math.min(fromIndex + size, allDays.size());
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

        List<MatchEntity> matches = status == MatchStatus.UPCOMING
            ? matchRepository.findAllInRangeAsc(
            start, end, poolIds, poolIds.size(), status, teamIds, teamIds.size(), active)
            : matchRepository.findAllInRangeDesc(
            start, end, poolIds, poolIds.size(), status, teamIds, teamIds.size(), active);

        boolean hasNext = toIndex < allDays.size();
        if (matches.isEmpty()) {
            return new DayPageView(List.of(), false, hasNext ? page + 1 : null);
        }

        Map<Long, MatchLiveLinkEntity> activeLinks = activeLinks(matches);
        Map<LocalDate, List<MatchEntity>> matchesByDate = matches.stream()
            .collect(Collectors.groupingBy(match -> ZonedDateTime.ofInstant(match.getMatchDate(), PARIS).toLocalDate()));
        List<DayMatchesView> days = selectedDays.stream()
            .map(day -> new DayMatchesView(day, toPools(matchesByDate.getOrDefault(day, List.of()), activeLinks)))
            .toList();
        return new DayPageView(days, hasNext, hasNext ? page + 1 : null);
    }

    @Override
    @Transactional(readOnly = true)
    public MatchView getMatchById(Long id) {
        MatchEntity match = loadMatch(id);
        MatchLiveLinkEntity activeLink = liveLinkRepository
            .findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(id, LiveLinkStatus.ACTIVE)
            .orElse(null);
        return toView(match, activeLink);
    }

    @Override
    @Transactional
    public MatchView createMatch(CreateMatchCommand command) {
        MatchEntity match = MatchEntity.builder()
            .matchCode(command.matchCode())
            .leagueCode(command.leagueCode())
            .poolId(command.poolId())
            .liveCode(command.liveCode())
            .teamIdA(command.teamIdA())
            .teamIdB(command.teamIdB())
            .matchDate(command.matchDate())
            .season(command.season())
            .set(command.set())
            .score(command.score())
            .status(command.set() == null ? MatchStatus.UPCOMING : MatchStatus.FINISHED)
            .venue(command.venue())
            .firstReferee(command.firstReferee())
            .secondReferee(command.secondReferee())
            .active(command.active() == null ? true : command.active())
            .build();
        MatchView created = toView(matchRepository.saveAndFlush(match), null);
        LOGGER.info("Created match", keyValue("action", "create_match"), keyValue("matchId", created.id()));
        return created;
    }

    @Override
    @Transactional
    public MatchView updateMatch(Long id, UpdateMatchCommand command) {
        MatchEntity match = loadMatch(id);
        boolean becameFinished = match.getStatus() == MatchStatus.UPCOMING && command.set() != null;
        match.setMatchCode(command.matchCode());
        match.setLeagueCode(command.leagueCode());
        match.setPoolId(command.poolId());
        match.setLiveCode(command.liveCode());
        match.setTeamIdA(command.teamIdA());
        match.setTeamIdB(command.teamIdB());
        match.setMatchDate(command.matchDate());
        match.setSeason(command.season());
        match.setSet(command.set());
        match.setScore(command.score());
        match.setVenue(command.venue());
        match.setFirstReferee(command.firstReferee());
        match.setSecondReferee(command.secondReferee());
        match.setActive(true);
        if (becameFinished) {
            match.setStatus(MatchStatus.FINISHED);
        }

        MatchLiveLinkEntity activeLink = liveLinkRepository
            .findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(id, LiveLinkStatus.ACTIVE)
            .orElse(null);
        MatchView updated = toView(matchRepository.saveAndFlush(match), activeLink);
        if (becameFinished) {
            eventPublisher.publishMatchFinished(updated);
        }
        LOGGER.info("Updated match", keyValue("action", "update_match"), keyValue("matchId", id));
        return updated;
    }

    @Override
    @Transactional
    public void bulkDeactivateMatches(Long poolId, List<String> matchCodesToDeactivate) {
        Set<String> codes = new HashSet<>(matchCodesToDeactivate == null ? List.of() : matchCodesToDeactivate);
        List<MatchEntity> matches = matchRepository.findByActiveTrueAndPoolIdAndMatchCodeIn(poolId, codes);
        matches.forEach(match -> match.setActive(false));
        matchRepository.saveAllAndFlush(matches);
        LOGGER.info("Deactivated matches for pool", keyValue("action", "bulk_deactivate_matches"),
            keyValue("poolId", poolId), keyValue("count", matches.size()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MatchLiveSummaryView> listMatchesForLiveModeration(LiveLinkStatus statusFilter) {
        return matchRepository.findAllWithLiveLinks().stream()
            .map(match -> toLiveSummary(match, statusFilter))
            .filter(Objects::nonNull)
            .sorted(Comparator.comparing(MatchLiveSummaryView::matchDate).reversed())
            .toList();
    }

    private List<MatchView> toViews(List<MatchEntity> matches) {
        Map<Long, MatchLiveLinkEntity> links = activeLinks(matches);
        return matches.stream().map(match -> toView(match, links.get(match.getId()))).toList();
    }

    private List<PoolMatchesView> toPools(
        List<MatchEntity> matches, Map<Long, MatchLiveLinkEntity> activeLinks) {
        return matches.stream()
            .collect(Collectors.groupingBy(MatchEntity::getPoolId, TreeMap::new, Collectors.toList()))
            .entrySet().stream()
            .map(entry -> new PoolMatchesView(entry.getKey(), entry.getValue().stream()
                .map(match -> toView(match, activeLinks.get(match.getId())))
                .toList()))
            .toList();
    }

    private Map<Long, MatchLiveLinkEntity> activeLinks(List<MatchEntity> matches) {
        if (matches.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = matches.stream().map(MatchEntity::getId).distinct().toList();
        return liveLinkRepository.findByMatchIdInAndStatus(ids, LiveLinkStatus.ACTIVE).stream()
            .collect(Collectors.toMap(
                link -> link.getMatch().getId(),
                link -> link,
                (left, right) -> left.getCreatedAt().isAfter(right.getCreatedAt()) ? left : right));
    }

    private MatchEntity loadMatch(Long id) {
        return matchRepository.findById(id).orElseThrow(() -> new MatchNotFoundException(id));
    }

    private MatchView toView(MatchEntity match, MatchLiveLinkEntity liveLink) {
        return new MatchView(
            match.getId(), match.getMatchCode(), match.getLeagueCode(), match.getPoolId(), match.getLiveCode(),
            match.getTeamIdA(), match.getTeamIdB(), match.getMatchDate(), match.getSeason(), match.getSet(),
            match.getScore(), match.getStatus(), match.getVenue(), match.getFirstReferee(), match.getSecondReferee(),
            match.getActive(), match.getCreatedAt(), match.getLastUpdate(),
            liveLink == null ? null : liveLink.getUrl(),
            liveLink == null ? null : liveLink.getProvider(),
            liveLink == null ? null : liveLink.getOwnerAuth0Id());
    }

    private MatchLiveSummaryView toLiveSummary(MatchEntity match, LiveLinkStatus statusFilter) {
        List<MatchLiveLinkEntity> links = match.getLiveLinks();
        if (links == null || links.isEmpty()
            || statusFilter != null && links.stream().noneMatch(link -> link.getStatus() == statusFilter)) {
            return null;
        }
        MatchLiveLinkEntity representative = links.stream()
            .max(Comparator.comparingInt((MatchLiveLinkEntity link) -> statusPriority(link.getStatus()))
                .thenComparing(MatchLiveLinkEntity::getCreatedAt,
                    Comparator.nullsLast(Comparator.naturalOrder())))
            .orElse(null);
        if (representative == null) {
            return null;
        }
        return new MatchLiveSummaryView(
            match.getId(), match.getMatchCode(), match.getLeagueCode(), match.getPoolId(), match.getTeamIdA(),
            match.getTeamIdB(), match.getMatchDate(), match.getSeason(), match.getSet(), match.getScore(),
            match.getStatus(), match.getLiveCode(), representative.getId(), representative.getStatus(),
            representative.getProvider(), representative.getUrl(), representative.getOwnerAuth0Id(),
            representative.getCreatedAt());
    }

    private int statusPriority(LiveLinkStatus status) {
        if (status == null) {
            return 0;
        }
        return switch (status) {
            case ACTIVE -> 6;
            case PENDING -> 5;
            case BANNED -> 4;
            case DEACTIVATED -> 3;
            case REJECTED -> 2;
            case EXPIRED -> 1;
        };
    }
}
