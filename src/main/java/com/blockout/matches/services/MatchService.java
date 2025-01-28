package com.blockout.matches.services;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.Match;
import com.blockout.matches.models.MatchStatus;
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
import java.util.List;
import java.util.Optional;

@Service
public class MatchService {

    private static final Logger logger = LoggerFactory.getLogger(MatchService.class);

    @Autowired
    private MatchRepository matchRepository;

    public Match createMatch(Match match) {
        Match createdMatch = matchRepository.save(match);
        logger.info("Match created successfully",
                keyValue("action", "create_match"),
                keyValue("matchId", createdMatch.getId()));
        return createdMatch;
    }

    public Page<Match> getAllMatches(Pageable pageable) {
        LocalDateTime today = LocalDateTime.now();

        // Construction d’un Sort multiple (jour -> pool -> date/time exact)
        Sort sort = Sort.by(
                // 1. On trie par la date/time ascendante
                Sort.Order.asc("matchDate"),
                // 2. On trie ensuite par pool.id (assure-toi que ta propriété s’appelle “pool”
                // et non “poolId” si c’est un objet)
                Sort.Order.asc("pool.id"),
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