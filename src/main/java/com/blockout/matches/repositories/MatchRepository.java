package com.blockout.matches.repositories;

import com.blockout.matches.models.Match;
import com.blockout.matches.models.MatchStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {
        Optional<Match> findByLeagueCodeAndMatchCode(String leagueCode, String matchCode);

        List<Match> findByPoolIdAndActive(Long poolId, Boolean active);

        List<Match> findByStatusAndActiveAndMatchDateLessThanEqual(MatchStatus status, boolean active,
                        LocalDateTime matchDate);

        @Query("SELECT m FROM Match m WHERE m.poolId = :poolId AND m.teamIdA = :teamIdA AND m.teamIdB = :teamIdB AND DATE(m.matchDate) = :matchDate")
        Optional<Match> findByPoolIdAndTeamIdAAndTeamIdBAndMatchDate(
                        @Param("poolId") Long poolId,
                        @Param("teamIdA") Long teamIdA,
                        @Param("teamIdB") Long teamIdB,
                        @Param("matchDate") LocalDate matchDate);

        List<Match> findByTeamIdAOrTeamIdB(Long teamIdA, Long teamIdB);

        List<Match> findByPoolId(Long poolId);

        Page<Match> findAllByOrderByMatchDateDescPoolIdAsc(Pageable pageable);

}