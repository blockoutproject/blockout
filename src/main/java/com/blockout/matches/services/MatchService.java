package com.blockout.matches.services;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.Match;
import com.blockout.matches.models.MatchStatus;
import com.blockout.matches.models.dto.DayMatchesDTO;
import com.blockout.matches.models.dto.DayPageDTO;
import com.blockout.matches.models.dto.PoolMatchesDTO;
import com.blockout.matches.repositories.MatchRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class MatchService {

    private static final Logger logger = LoggerFactory.getLogger(MatchService.class);

    @Autowired
    private MatchRepository matchRepository;

    private static final List<Long> POOLS_WHEN_NULL = List.of(1L, 2L, 3L, 282L);

    public Match createMatch(Match match) {
        Match createdMatch = matchRepository.save(match);
        logger.info("Match created successfully",
                keyValue("action", "create_match"),
                keyValue("matchId", createdMatch.getId()));
        return createdMatch;
    }

    public DayPageDTO getMatchesByDay(Long poolId, int page, int size, MatchStatus status) {
        LocalDateTime now = LocalDateTime.now();
    
        // 1) Récupérer toutes les dates distinctes
        List<LocalDate> allDays;
        if (status == MatchStatus.UPCOMING) {
            allDays = matchRepository.findDistinctUpcomingDates(poolId);
        } else {
            allDays = matchRepository.findDistinctDatesUntil(now, poolId);
        }
    
        // 2) Pagination
        int fromIndex = page * size;
        if (fromIndex >= allDays.size()) {
            return new DayPageDTO(Collections.emptyList(), false, null);
        }
        int toIndex = Math.min(fromIndex + size, allDays.size());
        List<LocalDate> subDays = allDays.subList(fromIndex, toIndex);
        
        // 3) Déterminer la plage de dates en fonction du tri (ASC pour UPCOMING, DESC pour FINISHED)
        LocalDate minDay, maxDay;
        if (status == MatchStatus.UPCOMING) {
            // Tri croissant (les dates les plus anciennes en premier)
            minDay = subDays.get(0);                   // le plus ancien
            maxDay = subDays.get(subDays.size() - 1);    // le plus récent
        } else {
            // Tri décroissant (les dates les plus récentes en premier)
            minDay = subDays.get(subDays.size() - 1);    // le plus ancien
            maxDay = subDays.get(0);                     // le plus récent
        }
        
        LocalDateTime startOfMinDay = minDay.atStartOfDay();
        LocalDateTime endDateTime;
        if (status == MatchStatus.UPCOMING) {
            // Pour UPCOMING, on prend toujours jusqu'au lendemain de maxDay
            endDateTime = maxDay.plusDays(1).atStartOfDay();
        } else {
            if (maxDay.equals(LocalDate.now())) {
                endDateTime = now;
            } else {
                endDateTime = maxDay.plusDays(1).atStartOfDay();
            }
        }
        
        // 4) Récupérer tous les matchs dans la plage
        List<Match> allMatches = matchRepository.findAllInRange(startOfMinDay, endDateTime, poolId, status, POOLS_WHEN_NULL);
        
        // 5) Grouper par date
        Map<LocalDate, List<Match>> matchesByDate = allMatches.stream()
                .collect(Collectors.groupingBy(m -> m.getMatchDate().toLocalDate()));
        
        // 6) Construire la liste DayMatchesDTO
        List<DayMatchesDTO> dayMatchesList = subDays.stream().map(day -> {
            List<Match> matchesForDay = matchesByDate.getOrDefault(day, Collections.emptyList());
            if (poolId == null) {
                Map<Long, List<Match>> matchesByPool = matchesForDay.stream()
                        .collect(Collectors.groupingBy(Match::getPoolId, TreeMap::new, Collectors.toList()));
                List<PoolMatchesDTO> poolsDto = matchesByPool.entrySet().stream()
                        .map(e -> new PoolMatchesDTO(e.getKey(), e.getValue()))
                        .collect(Collectors.toList());
                return new DayMatchesDTO(day, poolsDto);
            } else {
                PoolMatchesDTO singlePoolDto = new PoolMatchesDTO(poolId, matchesForDay);
                return new DayMatchesDTO(day, Collections.singletonList(singlePoolDto));
            }
        }).collect(Collectors.toList());
        
        // 7) Page suivante ?
        boolean hasNext = (toIndex < allDays.size());
        Integer nextPage = hasNext ? (page + 1) : null;
        
        return new DayPageDTO(dayMatchesList, hasNext, nextPage);
    }

    public Page<Match> getAllMatches(Pageable pageable) {
        LocalDateTime today = LocalDateTime.now();

        // Construction d’un Sort multiple (jour -> pool -> date/time exact)
        Sort sort = Sort.by(
                // 1. On trie par la date/time ascendante
                Sort.Order.desc("matchDate"),
                // 2. On trie ensuite par pool.id (assure-toi que ta propriété s’appelle “pool”
                // et non “poolId” si c’est un objet)
                Sort.Order.asc("poolId"),
                // 3. Pour forcer l’ordre chronologique, on reste sur la date/time ascendante
                // (souvent redondant, car le tri par date/time est déjà fait, mais tu peux le
                // conserver)
                Sort.Order.asc("matchDate"));

        // On "fusionne" ce sort avec le pageable d’entrée.
        Pageable pageableWithSort = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                sort);

        return matchRepository.findAllByMatchDateLessThanEqual(today, pageableWithSort);
    }

    public Optional<Match> getMatchById(Long id) {
        Optional<Match> matchOpt = matchRepository.findById(id);
        if (!matchOpt.isPresent()) {
            logger.warn("No match found with given ID",
                    keyValue("action", "get_match_by_id"),
                    keyValue("matchId", id));
        }
        return matchOpt;
    }

    public List<Match> getMatchesByPool(Long poolId) {
        List<Match> matches = matchRepository.findByPoolId(poolId);
        if (matches.isEmpty()) {
            logger.warn("No matches found for pool ID",
                    keyValue("action", "get_matches_by_pool"),
                    keyValue("poolId", poolId));
        }
        return matches;
    }

    public Match updateMatch(Long id, Match updatedMatch) {
        return matchRepository.findById(id).map(match -> {
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

            logger.info("Match updated successfully",
                    keyValue("action", "update_match"),
                    keyValue("matchId", savedMatch.getId()));
            return savedMatch;
        }).orElseThrow(() -> {
            logger.error("Match not found, cannot update",
                    keyValue("action", "update_match"),
                    keyValue("matchId", id));
            return new MatchNotFoundException(id);
        });
    }

    public Match deactivateMatch(Long matchId) {
        return matchRepository.findById(matchId).map(match -> {
            match.setActive(false);
            Match updatedMatch = matchRepository.save(match);

            logger.info("Match successfully deactivated",
                    keyValue("action", "deactivate_match"),
                    keyValue("matchId", matchId));

            return updatedMatch;
        }).orElseThrow(() -> {
            logger.error("Match not found. Cannot deactivate.",
                    keyValue("action", "deactivate_match"),
                    keyValue("matchId", matchId));
            return new MatchNotFoundException(matchId);
        });
    }

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
                        keyValue("action", "deactivate_match"),
                        keyValue("matchId", match.getId()),
                        keyValue("poolId", poolId));
            });
        }
    }

    public void deactivateMatchesByTeamId(Long teamId) {
        List<Match> matches = matchRepository.findByTeamIdAOrTeamIdB(teamId, teamId);
        if (matches.isEmpty()) {
            logger.warn("No matches found for team ID. No deactivation performed.",
                    keyValue("action", "deactivate_matches_by_team"),
                    keyValue("teamId", teamId));
        } else {
            matches.forEach(match -> {
                match.setActive(false);
                matchRepository.save(match);
                logger.info("Match deactivated as part of team deactivation",
                        keyValue("action", "deactivate_match"),
                        keyValue("matchId", match.getId()),
                        keyValue("teamId", teamId));
            });
        }
    }

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

    public List<Match> getActiveMatchesByPoolId(Long poolId) {
        List<Match> matches = matchRepository.findByPoolIdAndActive(poolId, true);
        return matches;
    }

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