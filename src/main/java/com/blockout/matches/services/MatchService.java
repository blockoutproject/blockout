package com.blockout.matches.services;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.Match;
import com.blockout.matches.models.MatchStatus;
import com.blockout.matches.models.dto.DayMatchesDTO;
import com.blockout.matches.models.dto.DayPageDTO;
import com.blockout.matches.models.dto.PoolMatchesDTO;
import com.blockout.matches.repositories.MatchRepository;
import com.blockout.matches.utils.DiffUtils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class MatchService {

    private static final Logger logger = LoggerFactory.getLogger(MatchService.class);

    private final MatchRepository matchRepository;

    public MatchService(MatchRepository matchRepository) {
        this.matchRepository = matchRepository;
    }

    /**
     * Crée un nouveau match
     * 
     * @param match L'objet Match à créer
     * @return Le match créé avec son ID généré
     */
    @Transactional
    public Match createMatch(Match match) {
        Match createdMatch = matchRepository.save(match);
        logger.info("Match created successfully",
                keyValue("action", "create_match"),
                keyValue("matchId", createdMatch.getId()));
        return createdMatch;
    }

    public DayPageDTO getMatchesByDay(
            List<Long> poolIds,
            List<Long> teamIds,
            MatchStatus status,
            int page,
            int size) {

        LocalDateTime now = LocalDateTime.now();

        logger.info("Fetching matches grouped by day",
                keyValue("action", "get_matches_by_day"),
                keyValue("status", status),
                keyValue("page", page),
                keyValue("size", size),
                keyValue("poolIds", poolIds),
                keyValue("teamIds", teamIds));

        // Récupère la liste de jours distincts
        List<LocalDate> allDays;
        if (status == MatchStatus.UPCOMING) {
            allDays = matchRepository.findDistinctUpcomingDates(
                    poolIds, poolIds.size(),
                    teamIds, teamIds.size());
            logger.info("Found distinct upcoming match days",
                    keyValue("count", allDays.size()));
        } else {
            allDays = matchRepository.findDistinctDatesUntil(
                    now,
                    poolIds, poolIds.size(),
                    teamIds, teamIds.size());
            logger.info("Found distinct past match days",
                    keyValue("count", allDays.size()));
        }

        // Pagination sur la liste de jours
        int fromIndex = page * size;
        if (fromIndex >= allDays.size()) {
            logger.info("Requested page exceeds total available days",
                    keyValue("fromIndex", fromIndex),
                    keyValue("totalDays", allDays.size()));
            return new DayPageDTO(Collections.emptyList(), false, null);
        }

        int toIndex = Math.min(fromIndex + size, allDays.size());
        List<LocalDate> subDays = allDays.subList(fromIndex, toIndex);

        logger.info("Paginated days selected",
                keyValue("from", fromIndex),
                keyValue("to", toIndex),
                keyValue("selectedDaysCount", subDays.size()));

        // minDay et maxDay
        LocalDate minDay, maxDay;
        if (status == MatchStatus.UPCOMING) {
            minDay = subDays.get(0);
            maxDay = subDays.get(subDays.size() - 1);
        } else {
            minDay = subDays.get(subDays.size() - 1);
            maxDay = subDays.get(0);
        }

        LocalDateTime startOfMinDay = minDay.atStartOfDay();
        LocalDateTime endDateTime;
        if (status == MatchStatus.UPCOMING) {
            endDateTime = maxDay.plusDays(1).atStartOfDay();
        } else {
            endDateTime = maxDay.equals(LocalDate.now())
                    ? now
                    : maxDay.plusDays(1).atStartOfDay();
        }

        logger.info("Computed date range for match fetching",
                keyValue("start", startOfMinDay),
                keyValue("end", endDateTime));

        // Récupère les matchs dans cette plage
        List<Match> allMatches = matchRepository.findAllInRange(
                startOfMinDay,
                endDateTime,
                poolIds, poolIds.size(),
                status,
                teamIds, teamIds.size());

        logger.info("Fetched matches in date range",
                keyValue("matchesCount", allMatches.size()));

        // Groupement par date
        Map<LocalDate, List<Match>> matchesByDate = allMatches.stream()
                .collect(Collectors.groupingBy(m -> m.getMatchDate().toLocalDate()));

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

        logger.info("Returning paginated match result",
                keyValue("dayGroupsCount", dayMatchesList.size()),
                keyValue("hasNext", hasNext),
                keyValue("nextPage", nextPage));

        return new DayPageDTO(dayMatchesList, hasNext, nextPage);
    }

    /**
     * Récupère tous les matchs avec pagination
     * 
     * @param pageable L'objet Pageable pour la pagination
     * @return Une page de matchs
     */
    public Page<Match> getAllMatches(Pageable pageable) {
        LocalDateTime today = LocalDateTime.now();

        // Construction d'un Sort multiple (jour -> pool -> date/time exact)
        Sort sort = Sort.by(
                // 1. On trie par la date/time ascendante
                Sort.Order.desc("matchDate"),
                // 2. On trie ensuite par pool.id (assure-toi que ta propriété s'appelle "pool"
                // et non "poolId" si c'est un objet)
                Sort.Order.asc("poolId"),
                // 3. Pour forcer l'ordre chronologique, on reste sur la date/time ascendante
                // (souvent redondant, car le tri par date/time est déjà fait, mais tu peux le
                // conserver)
                Sort.Order.asc("matchDate"));

        // On "fusionne" ce sort avec le pageable d'entrée.
        Pageable pageableWithSort = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                sort);

        return matchRepository.findAllByMatchDateLessThanEqual(today, pageableWithSort);
    }

    /**
     * Récupère un match par son ID
     * 
     * @param id L'identifiant du match
     * @return Optional contenant le match s'il existe
     */
    public Optional<Match> getMatchById(Long id) {
        Optional<Match> matchOpt = matchRepository.findById(id);
        if (!matchOpt.isPresent()) {
            logger.warn("No match found with given ID",
                    keyValue("action", "get_match_by_id"),
                    keyValue("matchId", id));
        }
        return matchOpt;
    }

    /**
     * Récupère les matchs par pool
     * 
     * @param poolId L'identifiant de la pool
     * @return Liste des matchs de la pool
     */
    public List<Match> getMatchesByPool(Long poolId) {
        List<Match> matches = matchRepository.findByPoolId(poolId);
        if (matches.isEmpty()) {
            logger.warn("No matches found for pool ID",
                    keyValue("action", "get_matches_by_pool"),
                    keyValue("poolId", poolId));
        }
        return matches;
    }

    /**
     * Met à jour un match existant
     * 
     * @param id           L'identifiant du match à mettre à jour
     * @param updatedMatch Les nouvelles données du match
     * @return Le match mis à jour
     * @throws MatchNotFoundException Si le match n'existe pas
     */
    @Transactional
    public Match updateMatch(Long id, Match updatedMatch) {
        return matchRepository.findById(id).map(match -> {

            Match before = match.toBuilder().build(); 

            match.setMatchCode(updatedMatch.getMatchCode());
            match.setLeagueCode(updatedMatch.getLeagueCode());
            match.setMatchDate(updatedMatch.getMatchDate());
            match.setTeamIdA(updatedMatch.getTeamIdA());
            match.setTeamIdB(updatedMatch.getTeamIdB());
            match.setPoolId(updatedMatch.getPoolId());
            match.setScore(updatedMatch.getScore());
            match.setSet(updatedMatch.getSet());
            match.setStatus(updatedMatch.getStatus());
            match.setLiveCode(updatedMatch.getLiveCode());
            match.setVenue(updatedMatch.getVenue());
            match.setReferee1(updatedMatch.getReferee1());
            match.setReferee2(updatedMatch.getReferee2());
            match.setActive(true);

            Match savedMatch = matchRepository.save(match);

            DiffUtils.logChanges(before, savedMatch, logger, "update_match", savedMatch.getId());

            return savedMatch;
        }).orElseThrow(() -> {
            logger.error("Match not found, cannot update",
                    keyValue("action", "update_match"),
                    keyValue("matchId", id));
            return new MatchNotFoundException(id);
        });
    }

    @Transactional
    public void bulkDeactivateMatches(Long poolId, List<String> matchCodesToDeactivate) {
        Set<String> matchCodesToDeactivateSet = new HashSet<>(matchCodesToDeactivate);
        logger.info("Début de la désactivation en masse des matches",
                keyValue("action", "bulk_deactivate_matches"),
                keyValue("poolId", poolId),
                keyValue("matchCodesToDeactivateSet", matchCodesToDeactivateSet));

        List<Match> matchesToDeactivate = matchRepository
                .findByActiveTrueAndPoolIdAndMatchCodeIn(poolId, matchCodesToDeactivateSet);

        if (matchesToDeactivate.isEmpty()) {
            logger.info("Aucun match trouvé à désactiver pour la pool et les codes fournis",
                    keyValue("action", "bulk_deactivate_matches"),
                    keyValue("poolId", poolId),
                    keyValue("matchCodesToDeactivateSet", matchCodesToDeactivateSet));
            return;
        }

        matchesToDeactivate.forEach(match -> match.setActive(false));
        matchRepository.saveAll(matchesToDeactivate);

        logger.info("Matches désactivés en masse",
                keyValue("action", "bulk_deactivate_matches"),
                keyValue("poolId", poolId),
                keyValue("nombreMatches", matchesToDeactivate.size()));
    }

    /**
     * Désactive tous les matchs d'une pool
     * 
     * @param poolId L'identifiant de la pool
     */
    @Transactional
    public void deactivateMatchesByPoolId(Long poolId) {
        List<Match> matches = matchRepository.findByPoolId(poolId);
        if (matches.isEmpty()) {
            logger.warn("No matches found for pool ID. No deactivation performed.",
                    keyValue("action", "deactivate_matches_by_pool"),
                    keyValue("poolId", poolId));
        } else {
            matches.forEach(match -> {
                match.setActive(false);
                matchRepository.save(match);
                logger.info("Match deactivated as part of pool deactivation",
                        keyValue("action", "deactivate_matches_by_pool"),
                        keyValue("matchId", match.getId()),
                        keyValue("poolId", poolId));
            });
        }
    }

    /**
     * Désactive tous les matchs d'une équipe
     * 
     * @param teamId L'identifiant de l'équipe
     */
    @Transactional
    public void deactivateMatchesByTeamId(Long teamId) {
        List<Match> matches = matchRepository.findByActiveAndTeamId(true, teamId);
        if (matches.isEmpty()) {
            logger.warn("No actives matches found for team ID. No deactivation performed.",
                    keyValue("action", "deactivate_matches_by_team"),
                    keyValue("teamId", teamId));
        } else {
            matches.forEach(match -> {
                match.setActive(false);
                matchRepository.save(match);
                logger.info("Match deactivated as part of team deactivation",
                        keyValue("action", "deactivate_matches_by_team"),
                        keyValue("matchId", match.getId()),
                        keyValue("poolId", match.getPoolId()),
                        keyValue("teamId", teamId));
            });
        }
    }

    /**
     * Désactive tous les matchs d'une équipe dans une poule
     * 
     * @param teamId L'identifiant de l'équipe
     * @param poolId L'identifiant de la poule
     */
    @Transactional
    public void deactivateMatchesByTeamAndPool(Long teamId, Long poolId) {
        List<Match> matches = matchRepository.findByActiveAndPoolIdAndTeamId(true, poolId, teamId);
        if (matches.isEmpty()) {
            logger.warn("No actives matches found for team ID and pool ID. No deactivation performed.",
                    keyValue("action", "deactivate_matches_by_team_and_pool"),
                    keyValue("teamId", teamId),
                    keyValue("poolId", poolId));
        } else {
            matches.forEach(match -> {
                match.setActive(false);
                matchRepository.save(match);
                logger.info("Match deactivated as part of team and pool deactivation",
                        keyValue("action", "deactivate_matches_by_team_and_pool"),
                        keyValue("matchId", match.getId()),
                        keyValue("teamId", teamId),
                        keyValue("poolId", poolId));
            });
        }
    }

    /**
     * Récupère un match par code de ligue et code de match
     * 
     * @param leagueCode Le code de la ligue
     * @param matchCode  Le code du match
     * @return Optional contenant le match s'il existe
     */
    public Optional<Match> getMatchByLeagueCodeAndMatchCode(String leagueCode, String matchCode) {
        Optional<Match> matchOpt = matchRepository.findByLeagueCodeAndMatchCode(leagueCode, matchCode);
        if (!matchOpt.isPresent()) {
            logger.warn("No match found for given leagueCode and matchCode",
                    keyValue("action", "get_match_by_league_and_code"),
                    keyValue("leagueCode", leagueCode),
                    keyValue("matchCode", matchCode));
        }
        return matchOpt;
    }

    /**
     * Récupère les matchs actifs d'une pool
     * 
     * @param poolId L'identifiant de la pool
     * @return Liste des matchs actifs de la pool
     */
    public List<Match> getActiveMatchesByPoolId(Long poolId) {
        List<Match> matches = matchRepository.findByPoolIdAndActive(poolId, true);
        return matches;
    }

    /**
     * Récupère les matchs commencés selon le statut et l'état d'activation
     * 
     * @param status      Le statut des matchs
     * @param active      L'état d'activation des matchs
     * @param currentTime La date/heure actuelle
     * @return Liste des matchs correspondants
     */
    public List<Match> getStartedMatches(MatchStatus status, boolean active, LocalDateTime currentTime) {
        List<Match> matches = matchRepository.findByStatusAndActiveAndMatchDateLessThanEqual(status, active,
                currentTime);
        logger.info("Started matches retrieved",
                keyValue("action", "get_started_matches"),
                keyValue("status", status),
                keyValue("active", active),
                keyValue("count", matches.size()));
        return matches;
    }

    /**
     * Récupère un match par pool, équipes et date
     * 
     * @param poolId    L'identifiant de la pool
     * @param teamIdA   L'identifiant de la première équipe
     * @param teamIdB   L'identifiant de la deuxième équipe
     * @param matchDate La date du match
     * @return Optional contenant le match s'il existe
     */
    public Optional<Match> getMatchByPoolAndTeamsAndDate(Long poolId, Long teamIdA, Long teamIdB, LocalDate matchDate) {
        Optional<Match> matchOpt = matchRepository.findByPoolIdAndTeamIdAAndTeamIdBAndMatchDate(poolId, teamIdA,
                teamIdB, matchDate);
        if (!matchOpt.isPresent()) {
            logger.warn("No match found for given pool, teams and date",
                    keyValue("action", "get_match_by_pool_teams_date"),
                    keyValue("poolId", poolId),
                    keyValue("teamIdA", teamIdA),
                    keyValue("teamIdB", teamIdB),
                    keyValue("matchDate", matchDate.toString()));
        }
        return matchOpt;
    }
}