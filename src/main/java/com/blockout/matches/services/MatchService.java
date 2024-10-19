package com.blockout.matches.services;

import com.blockout.matches.models.Match;
import com.blockout.matches.repositories.MatchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MatchService {

    @Autowired
    private MatchRepository matchRepository;

    // Créer un nouveau match
    public Match createMatch(Match match) {
        return matchRepository.save(match);
    }

    // Récupérer tous les matchs
    public List<Match> getAllMatches() {
        return matchRepository.findAll();
    }

    // Récupérer un match par ID
    public Optional<Match> getMatchById(Long id) {
        return matchRepository.findById(id);
    }

    // Mettre à jour un match
    public Match updateMatch(Long id, Match updatedMatch) {
        return matchRepository.findById(id).map(match -> {
            match.setMatchCode(updatedMatch.getMatchCode());
            match.setLeagueCode(updatedMatch.getLeagueCode());
            match.setMatchDate(updatedMatch.getMatchDate());
            match.setTeamAId(updatedMatch.getTeamAId());
            match.setTeamBId(updatedMatch.getTeamBId());
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

    // Supprimer un match
    public void deleteMatch(Long id) {
        matchRepository.deleteById(id);
    }
}