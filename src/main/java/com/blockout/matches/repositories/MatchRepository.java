package com.blockout.matches.repositories;

import com.blockout.matches.models.Match;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {
    Optional<Match> findByLeagueCodeAndMatchCode(String leagueCode, String matchCode);
    List<Match> findByPoolIdAndActive(Long poolId, Boolean active);
    List<Match> findByStatusAndActiveAndMatchDateLessThanEqual(String status, boolean active, LocalDateTime matchDate);
}