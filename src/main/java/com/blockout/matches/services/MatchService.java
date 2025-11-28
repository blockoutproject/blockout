package com.blockout.matches.services;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.dto.match.DayMatchesDTO;
import com.blockout.matches.models.dto.match.DayPageDTO;
import com.blockout.matches.models.dto.match.MatchDTO;
import com.blockout.matches.models.dto.match.MatchScraperDTO;
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
import java.util.Collections;
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

    private final MatchRepository matchRepository;
    private final MatchLiveLinkRepository matchLiveLinkRepository;
    private final EventPublisher eventPublisher;

    /**
     * Crée un nouveau match
     * 
     * @param match L'objet Match à créer
     * @return Le match créé avec son ID généré
     */
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

    /**
     * Récupère les matchs en appliquant des filtres facultatifs. Pour scraper
     * actuellement.
     *
     * @param poolId  identifiant de la poule (null pour ignorer le filtre)
     * @param teamIds liste d'IDs d'équipes (null ou vide pour ignorer le filtre)
     * @param status  statut du match (null pour ignorer le filtre)
     * @param active  flag d'activation (null pour ignorer le filtre)
     * @return liste de matchs correspondant aux critères
     */
    public List<MatchScraperDTO> findMatches(
            Long poolId,
            List<Long> teamIds,
            MatchStatus status,
            Boolean active) {

        List<Long> safeTeamIds = (teamIds == null) ? Collections.emptyList() : teamIds;

        List<Match> matches = matchRepository.findFiltered(
                poolId,
                status,
                active,
                safeTeamIds,
                safeTeamIds.size());

        return matches.stream()
                .map(this::toScraperDto)
                .toList();
    }

    /**
     * Regroupe les matchs par jour avec pagination.
     *
     * @param poolIds listes des pools à inclure
     * @param teamIds listes des équipes à inclure
     * @param status  statut des matchs (UPCOMING pour futurs, autre pour passés)
     * @param page    indice de la page (0-based)
     * @param size    nombre de jours par page
     * @return un DayPageDTO contenant les groupes de matchs par jour, un indicateur
     *         hasNext et le numéro de nextPage
     */

    public DayPageDTO getMatchesByDay(
            List<Long> poolIds,
            List<Long> teamIds,
            MatchStatus status,
            int page,
            int size,
            Boolean active) {

        ZoneId PARIS = ZoneId.of("Europe/Paris");
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

        Map<LocalDate, List<Match>> matchesByDate = allMatches.stream()
                .collect(Collectors.groupingBy(m -> ZonedDateTime.ofInstant(m.getMatchDate(), PARIS).toLocalDate()));

        // Construction de DayMatchesDTO
        List<DayMatchesDTO> dayMatchesList = subDays.stream()
                .map(day -> {
                    List<Match> matchesForDay = matchesByDate.getOrDefault(day, Collections.emptyList());
                    Map<Long, List<Match>> matchesByPool = matchesForDay.stream()
                            .collect(Collectors.groupingBy(Match::getPoolId, TreeMap::new, Collectors.toList()));

                    List<PoolMatchesDTO> poolsDto = matchesByPool.entrySet().stream()
                            .map(e -> new PoolMatchesDTO(e.getKey(), e.getValue()))
                            .collect(Collectors.toList());

                    return new DayMatchesDTO(day, poolsDto);
                })
                .collect(Collectors.toList());

        boolean hasNext = (toIndex < allDays.size());
        Integer nextPage = hasNext ? (page + 1) : null;

        logger.debug("Returning paginated match result",
                keyValue("dayGroupsCount", dayMatchesList.size()),
                keyValue("hasNext", hasNext),
                keyValue("nextPage", nextPage));

        return new DayPageDTO(dayMatchesList, hasNext, nextPage);
    }

    /**
     * Récupère un match par son identifiant.
     *
     * @param id L'identifiant du match à récupérer
     * @return Le match correspondant
     * @throws MatchNotFoundException Si aucun match n'est trouvé avec cet ID
     */
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
                .liveEditLocked(match.isLiveEditLocked())
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

    /**
     * Récupère un match par son identifiant pour les test interne.
     *
     * @param id L'identifiant du match à récupérer
     * @return Le match correspondant
     * @throws MatchNotFoundException Si aucun match n'est trouvé avec cet ID
     */
    public Match getMatchByIdInternal(Long id) {
        return matchRepository.findById(id).orElseThrow(() -> {
            logger.warn("Match non trouvé", keyValue("matchId", id));
            return new MatchNotFoundException(id);
        });
    }

    /**
     * Met à jour un match existant.
     *
     * @param id           L'identifiant du match à mettre à jour
     * @param updatedMatch L'objet contenant les nouvelles données du match
     * @return Le match mis à jour
     * @throws MatchNotFoundException Si le match à mettre à jour n'existe pas
     */
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

    /**
     * Désactive en masse les matches actifs d'une pool pour les codes spécifiés.
     *
     * @param poolId                 L'identifiant de la pool
     * @param matchCodesToDeactivate Liste des codes de match à désactiver
     */
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

        // Pour chaque match, on désactive et on logue individuellement
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

    private MatchScraperDTO toScraperDto(Match m) {
        if (m == null)
            return null;

        return MatchScraperDTO.builder()
                .id(m.getId())
                .matchCode(m.getMatchCode())
                .leagueCode(m.getLeagueCode())
                .poolId(m.getPoolId())
                .teamIdA(m.getTeamIdA())
                .teamIdB(m.getTeamIdB())
                .matchDate(m.getMatchDate())
                .season(m.getSeason())
                .status(m.getStatus() != null ? m.getStatus().name() : null)
                .set(m.getSet())
                .score(m.getScore())
                .venue(m.getVenue())
                .firstReferee(m.getFirstReferee())
                .secondReferee(m.getSecondReferee())
                .liveCode(m.getLiveCode())
                .active(m.getActive())
                .createdAt(m.getCreatedAt())
                .lastUpdate(m.getLastUpdate())
                .build();
    }
}
