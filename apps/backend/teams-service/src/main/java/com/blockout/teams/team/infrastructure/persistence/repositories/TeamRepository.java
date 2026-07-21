package com.blockout.teams.team.infrastructure.persistence.repositories;

import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;
import com.blockout.teams.team.infrastructure.persistence.entities.TeamEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Persistence operations required by the Team application service.
 */
public interface TeamRepository extends JpaRepository<TeamEntity, Long> {

    List<TeamEntity> findByClubIdAndActiveTrue(String clubId);

    @Query("SELECT DISTINCT team.clubId FROM TeamEntity team WHERE team.clubId IS NOT NULL")
    List<String> findDistinctClubIds();

    @Query("""
        SELECT team
        FROM TeamEntity team
        WHERE (:divisionId IS NULL OR team.divisionId = :divisionId)
          AND (:format IS NULL OR team.format = :format)
          AND (:gender IS NULL OR team.gender = :gender)
          AND (:season IS NULL OR team.season = :season)
          AND (:clubId IS NULL OR team.clubId = :clubId)
          AND (:idsSize = 0 OR team.id IN :ids)
          AND (:active IS NULL OR team.active = :active)
        ORDER BY team.rawName ASC
        """)
    List<TeamEntity> findFiltered(
        @Param("divisionId") Long divisionId,
        @Param("format") Format format,
        @Param("gender") Gender gender,
        @Param("season") String season,
        @Param("clubId") String clubId,
        @Param("ids") List<Long> ids,
        @Param("idsSize") int idsSize,
        @Param("active") Boolean active);
}
