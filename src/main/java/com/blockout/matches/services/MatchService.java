package com.blockout.matches.services;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.dto.match.DayMatchesDTO;
import com.blockout.matches.models.dto.match.DayPageDTO;
import com.blockout.matches.models.dto.match.MatchDTO;
import com.blockout.matches.models.dto.match.MatchLiveSummaryDTO;
import com.blockout.matches.models.dto.match.PoolMatchesDTO;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.repositories.MatchRepository;
import com.blockout.matches.utils.DiffUtils;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchService {

    private static final Logger logger = LoggerFactory.getLogger(MatchService.class);

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");
    private static final int MODERATION_HISTORY_DAYS = 7;

    private final MatchRepository matchRepository;
    private final MatchLiveLinkRepository matchLiveLinkRepository;
    private final EventPublisher eventPublisher;

    @Transactional
    public Match createMatch(Match match) {
        if (match.getSet() != null) {
            match.setStatus(MatchStatus.FINISHED);
        } else {
            match.setStatus(MatchStatus.UPCOMING);
        }
        Match createdMatch = matchRepository.save(match);
        logger.info("Match created successfully",
                keyValue("action", "create_match"),
                keyValue("matchId", createdMatch.getId()));
        return createdMatch;
    }

    public List<Match> findMatches(
            Long poolId,
            List<Long> teamIds,
            MatchStatus status,
            Boolean active) {

        List<Long> safeTeamIds = (teamIds == null) ? Collections.emptyList() : teamIds;

        return matchRepository.findFiltered(
                poolId,
                status,
                active,
                safeTeamIds,
                safeTeamIds.size());
    }

    public DayPageDTO getMatchesByDay(
            List<Long> poolIds,
            List<Long> teamIds,
            MatchStatus status,
            int page,
            int size,
            Boolean active) {

        Instant now = Instant.now();
        LocalDate todayParis = LocalDate.now(PARIS);

        List<LocalDate> allDays;
        if (status == MatchStatus.UPCOMING) {
            allDays = matchRepository.findDistinctUpcomingDatesIncludingToday(
                    todayParis,
                    poolIds, poolIds.size(),
                    teamIds, teamIds.size());
        } else {
            allDays = matchRepository.findDistinctDatesUntil(
                    now,
                    poolIds, poolIds.size(),
                    teamIds, teamIds.size());
        }

        int fromIndex = page * size;
        if (fromIndex >= allDays.size()) {
            return new DayPageDTO(Collections.emptyList(), false, null);
        }

        int toIndex = Math.min(fromIndex + size, allDays.size());
        List<LocalDate> subDays = allDays.subList(fromIndex, toIndex);

        LocalDate minDay, maxDay;
        if (status == MatchStatus.UPCOMING) {
            minDay = subDays.get(0);
            maxDay = subDays.get(subDays.size() - 1);
        } else {
            minDay = subDays.get(subDays.size() - 1);
            maxDay = subDays.get(0);
        }

        Instant startOfMinDay = minDay.atStartOfDay(PARIS).toInstant();

        Instant endInstant;
        if (status == MatchStatus.UPCOMING) {
            endInstant = maxDay.plusDays(1).atStartOfDay(PARIS).toInstant();
        } else {
            LocalDate today = LocalDate.now(PARIS);
            endInstant = maxDay.equals(today)
                    ? now
                    : maxDay.plusDays(1).atStartOfDay(PARIS).toInstant();
        }

        // 1) On récupère tous les matchs de la plage
        List<Match> allMatches = (status == MatchStatus.UPCOMING)
                ? matchRepository.findAllInRangeAsc(
                        startOfMinDay,
                        endInstant,
                        poolIds, poolIds.size(),
                        status,
                        teamIds, teamIds.size(),
                        active)
                : matchRepository.findAllInRangeDesc(
                        startOfMinDay,
                        endInstant,
                        poolIds, poolIds.size(),
                        status,
                        teamIds, teamIds.size(),
                        active);

        if (allMatches.isEmpty()) {
            return new DayPageDTO(Collections.emptyList(), false, hasNext(allDays, toIndex) ? page + 1 : null);
        }

        // 2) On récupère tous les liens actifs de ces matchs en un seul coup
        List<Long> matchIds = allMatches.stream()
                .map(Match::getId)
                .distinct()
                .toList();

        List<MatchLiveLink> activeLinks = matchLiveLinkRepository
                .findByMatchIdInAndStatus(matchIds, LiveLinkStatus.ACTIVE);

        // Map matchId -> lien actif
        Map<Long, MatchLiveLink> activeByMatchId = activeLinks.stream()
                .collect(Collectors.toMap(
                        l -> l.getMatch().getId(),
                        l -> l,
                        // au cas où, on garde le plus récent
                        (l1, l2) -> l1.getCreatedAt().isAfter(l2.getCreatedAt()) ? l1 : l2));

        // 3) Grouping par jour
        Map<LocalDate, List<Match>> matchesByDate = allMatches.stream()
                .collect(Collectors.groupingBy(
                        m -> ZonedDateTime.ofInstant(m.getMatchDate(), PARIS).toLocalDate()));

        // 4) Construction des DTO avec liveUrl / provider
        List<DayMatchesDTO> dayMatchesList = subDays.stream()
                .map(day -> {
                    List<Match> matchesForDay = matchesByDate.getOrDefault(day, Collections.emptyList());

                    Map<Long, List<Match>> matchesByPool = matchesForDay.stream()
                            .collect(Collectors.groupingBy(Match::getPoolId, TreeMap::new, Collectors.toList()));

                    List<PoolMatchesDTO> poolsDto = matchesByPool.entrySet().stream()
                            .map(e -> {
                                Long poolId = e.getKey();
                                List<MatchDTO> matchDtos = e.getValue().stream()
                                        .map(m -> {
                                            MatchLiveLink live = activeByMatchId.get(m.getId());
                                            return MatchDTO.builder()
                                                    .id(m.getId())
                                                    .matchCode(m.getMatchCode())
                                                    .leagueCode(m.getLeagueCode())
                                                    .poolId(m.getPoolId())
                                                    .liveCode(m.getLiveCode())
                                                    .teamIdA(m.getTeamIdA())
                                                    .teamIdB(m.getTeamIdB())
                                                    .matchDate(m.getMatchDate())
                                                    .season(m.getSeason())
                                                    .set(m.getSet())
                                                    .score(m.getScore())
                                                    .status(m.getStatus())
                                                    .venue(m.getVenue())
                                                    .firstReferee(m.getFirstReferee())
                                                    .secondReferee(m.getSecondReferee())
                                                    .liveUrl(live != null ? live.getUrl() : null)
                                                    .liveProvider(live != null ? live.getProvider() : null)
                                                    .liveOwnerAuth0Id(live != null ? live.getOwnerAuth0Id() : null)
                                                    .build();
                                        })
                                        .toList();

                                return new PoolMatchesDTO(poolId, matchDtos);
                            })
                            .toList();

                    return new DayMatchesDTO(day, poolsDto);
                })
                .toList();

        boolean hasNext = (toIndex < allDays.size());
        Integer nextPage = hasNext ? (page + 1) : null;

        return new DayPageDTO(dayMatchesList, hasNext, nextPage);
    }

    public MatchDTO getMatchById(Long id) {

        Match match = matchRepository.findById(id).orElseThrow(() -> {
            logger.warn("Match non trouvé", keyValue("matchId", id));
            return new MatchNotFoundException(id);
        });

        MatchLiveLink live = matchLiveLinkRepository
                .findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(id, LiveLinkStatus.ACTIVE)
                .orElse(null);

        return MatchDTO.builder()
                .id(match.getId())
                .matchCode(match.getMatchCode())
                .leagueCode(match.getLeagueCode())
                .poolId(match.getPoolId())
                .liveCode(match.getLiveCode())
                .teamIdA(match.getTeamIdA())
                .teamIdB(match.getTeamIdB())
                .matchDate(match.getMatchDate())
                .season(match.getSeason())
                .set(match.getSet())
                .score(match.getScore())
                .status(match.getStatus())
                .venue(match.getVenue())
                .firstReferee(match.getFirstReferee())
                .secondReferee(match.getSecondReferee())
                .liveUrl(live != null ? live.getUrl() : null)
                .liveProvider(live != null ? live.getProvider() : null)
                .liveOwnerAuth0Id(live != null ? live.getOwnerAuth0Id() : null)
                .build();
    }

    public Match getMatchByIdInternal(Long id) {
        return matchRepository.findById(id).orElseThrow(() -> {
            logger.warn("Match non trouvé", keyValue("matchId", id));
            return new MatchNotFoundException(id);
        });
    }

    @Transactional
    public Match updateMatch(Long id, Match updatedMatch) {
        return matchRepository.findById(id).map(match -> {
            Match before = match.toBuilder().build();

            match.setMatchCode(updatedMatch.getMatchCode());
            match.setLeagueCode(updatedMatch.getLeagueCode());
            match.setMatchDate(updatedMatch.getMatchDate());
            match.setSeason(updatedMatch.getSeason());
            match.setTeamIdA(updatedMatch.getTeamIdA());
            match.setTeamIdB(updatedMatch.getTeamIdB());
            match.setPoolId(updatedMatch.getPoolId());
            match.setScore(updatedMatch.getScore());
            match.setSet(updatedMatch.getSet());
            match.setLiveCode(updatedMatch.getLiveCode());
            match.setVenue(updatedMatch.getVenue());
            match.setFirstReferee(updatedMatch.getFirstReferee());
            match.setSecondReferee(updatedMatch.getSecondReferee());
            match.setActive(true);

            if (!before.getActive() && match.getActive()) {
                logger.info("Match réactivé", keyValue("matchId", id));
            }

            if (before.getStatus() == MatchStatus.UPCOMING && match.getSet() != null) {
                match.setStatus(MatchStatus.FINISHED);
                eventPublisher.publishMatchFinished(match);
            }

            Match saved = matchRepository.save(match);
            DiffUtils.logChanges(before, saved, logger, "update_match", saved.getId());
            return saved;
        }).orElseThrow(() -> {
            logger.error("Impossible de mettre à jour, match non trouvé", keyValue("matchId", id));
            return new MatchNotFoundException(id);
        });
    }

    @Transactional
    public void bulkDeactivateMatches(Long poolId, List<String> matchCodesToDeactivate) {
        Set<String> toDeactivate = new HashSet<>(matchCodesToDeactivate);
        logger.info("Début de la désactivation en masse des matches",
                keyValue("action", "bulk_deactivate_matches"),
                keyValue("poolId", poolId),
                keyValue("matchCodesToDeactivate", toDeactivate));

        List<Match> matchesToDeactivate = matchRepository
                .findByActiveTrueAndPoolIdAndMatchCodeIn(poolId, toDeactivate);

        if (matchesToDeactivate.isEmpty()) {
            logger.info("Aucun match trouvé à désactiver pour la pool et les codes fournis",
                    keyValue("action", "bulk_deactivate_matches"),
                    keyValue("poolId", poolId),
                    keyValue("matchCodesToDeactivate", toDeactivate));
            return;
        }

        matchesToDeactivate.forEach(match -> {
            match.setActive(false);
            logger.info("Match désactivé",
                    keyValue("action", "deactivate_match"),
                    keyValue("poolId", poolId),
                    keyValue("matchCode", match.getMatchCode()));
        });

        matchRepository.saveAll(matchesToDeactivate);

        logger.info("Matches désactivés en masse",
                keyValue("action", "bulk_deactivate_matches"),
                keyValue("poolId", poolId),
                keyValue("nombreMatches", matchesToDeactivate.size()));
    }

    /**
     * Liste des matchs utilisés dans le panneau admin live :
     * - match avec au moins un lien ACTIVE ou PENDING (sans limite de temps)
     * - sinon match avec uniquement d'autres statuts, mais date de match >= now -
     * MODERATION_HISTORY_DAYS
     */
    @Transactional(readOnly = true)
    public List<MatchLiveSummaryDTO> listMatchesForLiveModeration() {
        Instant now = Instant.now();
        Instant cutoff = now.minus(MODERATION_HISTORY_DAYS, ChronoUnit.DAYS);

        List<MatchLiveLink> allLinks = matchLiveLinkRepository.findAllWithMatch();

        Map<Long, List<MatchLiveLink>> linksByMatchId = allLinks.stream()
                .filter(l -> l.getMatch() != null)
                .collect(Collectors.groupingBy(l -> l.getMatch().getId()));

        List<MatchLiveSummaryDTO> result = linksByMatchId.values().stream()
                .map(linksForMatch -> {

                    Match match = linksForMatch.get(0).getMatch();
                    if (match == null) {
                        return null;
                    }

                    boolean hasPendingOrActive = linksForMatch.stream()
                            .anyMatch(l -> l.getStatus() == LiveLinkStatus.PENDING
                                    || l.getStatus() == LiveLinkStatus.ACTIVE);

                    if (!hasPendingOrActive) {
                        Instant matchDate = match.getMatchDate();
                        if (matchDate.isBefore(cutoff)) {
                            return null;
                        }
                    }

                    MatchLiveLink lastLink = linksForMatch.stream()
                            .max(Comparator.comparing(MatchLiveLink::getCreatedAt))
                            .orElse(null);

                    if (lastLink == null) {
                        return null;
                    }

                    return MatchLiveSummaryDTO.builder()
                            .id(match.getId())
                            .matchCode(match.getMatchCode())
                            .leagueCode(match.getLeagueCode())
                            .poolId(match.getPoolId())
                            .teamIdA(match.getTeamIdA())
                            .teamIdB(match.getTeamIdB())
                            .matchDate(match.getMatchDate())
                            .season(match.getSeason())
                            .set(match.getSet())
                            .score(match.getScore())
                            .status(match.getStatus())
                            .liveCode(match.getLiveCode())
                            .lastLiveLinkId(lastLink.getId())
                            .lastLiveLinkStatus(lastLink.getStatus())
                            .lastLiveLinkProvider(lastLink.getProvider())
                            .lastLiveLinkUrl(lastLink.getUrl())
                            .lastLiveLinkOwnerAuth0Id(lastLink.getOwnerAuth0Id())
                            .lastLiveLinkCreatedAt(lastLink.getCreatedAt())
                            .build();
                })
                .filter(dto -> dto != null)
                .sorted(Comparator.comparing(MatchLiveSummaryDTO::getMatchDate).reversed())
                .collect(Collectors.toList());

        logger.info("Returning matches for live moderation",
                keyValue("action", "list_matches_for_live_moderation"),
                keyValue("count", result.size()));

        return result;
    }

    private boolean hasNext(List<LocalDate> allDays, int toIndex) {
        return toIndex < allDays.size();
    }

    /**
     * Helper éventuellement réutilisable ailleurs si tu veux un résumé isolé.
     */
    public MatchLiveSummaryDTO toMatchLiveSummaryDTO(Match match) {
        MatchLiveLink lastLink = matchLiveLinkRepository
                .findFirstByMatch_IdOrderByCreatedAtDesc(match.getId())
                .orElse(null);

        return MatchLiveSummaryDTO.builder()
                .id(match.getId())
                .matchCode(match.getMatchCode())
                .leagueCode(match.getLeagueCode())
                .poolId(match.getPoolId())
                .teamIdA(match.getTeamIdA())
                .teamIdB(match.getTeamIdB())
                .matchDate(match.getMatchDate())
                .season(match.getSeason())
                .set(match.getSet())
                .score(match.getScore())
                .status(match.getStatus())
                .liveCode(match.getLiveCode())
                .lastLiveLinkId(lastLink != null ? lastLink.getId() : null)
                .lastLiveLinkStatus(lastLink != null ? lastLink.getStatus() : null)
                .lastLiveLinkProvider(lastLink != null ? lastLink.getProvider() : null)
                .lastLiveLinkUrl(lastLink != null ? lastLink.getUrl() : null)
                .lastLiveLinkOwnerAuth0Id(lastLink != null ? lastLink.getOwnerAuth0Id() : null)
                .lastLiveLinkCreatedAt(lastLink != null ? lastLink.getCreatedAt() : null)
                .build();
    }
}