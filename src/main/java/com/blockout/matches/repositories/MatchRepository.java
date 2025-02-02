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

        Page<Match> findAllByMatchDateLessThanEqual(LocalDateTime today, Pageable pageable);

        /**
         * Récupère toutes les dates distinctes jusqu'à aujourd'hui, triées par ordre
         * décroissant.
         *
         * @param today La date limite (inclus).
         * @return Liste des dates distinctes.
         */
        @Query("SELECT DISTINCT CAST(m.matchDate AS LocalDate) FROM Match m " +
                        "WHERE m.matchDate <= :today " +
                        "AND m.poolId IN (1, 2, 3) " +
                        "ORDER BY CAST(m.matchDate AS LocalDate) DESC")
        List<LocalDate> findDistinctDatesUntil(@Param("today") LocalDateTime today);

        /**
         * Récupère tous les matchs d'une journée spécifique, indépendamment de l'heure.
         *
         * @param startOfDay     Début de la journée (00:00:00).
         * @param startOfNextDay Début de la journée suivante (00:00:00 du lendemain).
         * @return Liste des matchs de la journée.
         */
        @Query("SELECT m FROM Match m " +
                        "WHERE m.matchDate >= :startOfDay AND m.matchDate < :startOfNextDay " +
                        "ORDER BY m.poolId ASC, m.matchDate ASC")
        List<Match> findAllByDay(@Param("startOfDay") LocalDateTime startOfDay,
                        @Param("startOfNextDay") LocalDateTime startOfNextDay);
}