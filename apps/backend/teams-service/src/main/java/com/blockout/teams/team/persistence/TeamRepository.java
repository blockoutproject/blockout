package com.blockout.teams.team.persistence;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeamRepository extends JpaRepository<TeamEntity, Long> {

    List<TeamEntity> findByClubIdAndActiveTrue(String clubId);

    @Query("SELECT DISTINCT t.clubId FROM TeamEntity t WHERE t.clubId IS NOT NULL")
    List<String> findDistinctClubIdsLegacy();

    @Query(
            value = "SELECT DISTINCT t.clubId FROM TeamEntity t WHERE t.clubId IS NOT NULL ORDER BY t.clubId ASC",
            countQuery = "SELECT COUNT(DISTINCT t.clubId) FROM TeamEntity t WHERE t.clubId IS NOT NULL")
    Page<String> findDistinctClubIds(Pageable pageable);

    @Query("""
            SELECT t
            FROM TeamEntity t
            WHERE (:divisionId IS NULL OR t.divisionId = :divisionId)
                AND (:format IS NULL OR t.format = :format)
                AND (:gender IS NULL OR t.gender = :gender)
                AND (:season IS NULL OR t.season = :season)
                AND (:clubId IS NULL OR t.clubId = :clubId)
                AND (:idsSize = 0 OR t.id IN :ids)
                AND (:active IS NULL OR t.active = :active)
            ORDER BY t.rawName ASC
            """)
    List<TeamEntity> findFilteredLegacy(
            @Param("divisionId") Long divisionId,
            @Param("format") FormatEnum format,
            @Param("gender") GenderEnum gender,
            @Param("season") String season,
            @Param("clubId") String clubId,
            @Param("ids") List<Long> ids,
            @Param("idsSize") int idsSize,
            @Param("active") Boolean active);

    @Query("""
            SELECT t
            FROM TeamEntity t
            WHERE (:divisionId IS NULL OR t.divisionId = :divisionId)
                AND (:format IS NULL OR t.format = :format)
                AND (:gender IS NULL OR t.gender = :gender)
                AND (:season IS NULL OR t.season = :season)
                AND (:clubId IS NULL OR t.clubId = :clubId)
                AND (:idsSize = 0 OR t.id IN :ids)
                AND (:active IS NULL OR t.active = :active)
            """)
    Page<TeamEntity> findFiltered(
            @Param("divisionId") Long divisionId,
            @Param("format") FormatEnum format,
            @Param("gender") GenderEnum gender,
            @Param("season") String season,
            @Param("clubId") String clubId,
            @Param("ids") List<Long> ids,
            @Param("idsSize") int idsSize,
            @Param("active") Boolean active,
            Pageable pageable);
}
