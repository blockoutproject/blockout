package com.blockout.matches.services;

import com.blockout.matches.models.Match;
import com.blockout.matches.repositories.MatchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class MatchService {

    @Autowired
    private MatchRepository matchRepository;

    public Match createMatch(Match match) {
        return matchRepository.save(match);
    }

    public List<Match> getAllMatches() {
        return matchRepository.findAll();
    }

    public Optional<Match> getMatchById(Long id) {
        return matchRepository.findById(id);
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
            match.setVenue(updatedMatch.getVenue());
            match.setReferee1(updatedMatch.getReferee1());
            match.setReferee2(updatedMatch.getReferee2());
            match.setActive(updatedMatch.getActive());
            return matchRepository.save(match);
        }).orElseThrow(() -> new RuntimeException("Match not found with id " + id));
    }

    public void deleteMatch(Long id) {
        matchRepository.deleteById(id);
    }

    public Optional<Match> getMatchByLeagueCodeAndMatchCode(String leagueCode, String matchCode) {
        return matchRepository.findByLeagueCodeAndMatchCode(leagueCode, matchCode);
    }

    public List<Match> getActiveMatchesByPoolId(Long poolId) {
        return matchRepository.findByPoolIdAndActive(poolId, true);
    }

    public List<Match> getStartedMatches(String status, boolean active, LocalDateTime currentTime) {
        return matchRepository.findByStatusAndActiveAndMatchDateLessThanEqual(status, active, currentTime);
    }
}