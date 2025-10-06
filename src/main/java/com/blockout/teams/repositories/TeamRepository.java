package com.blockout.teams.repositories;

import com.blockout.teams.models.Team;
import com.blockout.teams.models.enums.Format;
import com.blockout.teams.models.enums.Gender;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByClubIdAndActiveTrue(String clubId);

    @Query("SELECT DISTINCT t.clubId FROM Team t WHERE t.clubId IS NOT NULL")
    List<String> findDistinctClubIds();

    @Query("""
            SELECT t
            FROM Team t
            WHERE (:name IS NULL OR t.name = :name)
                AND (:divisionId IS NULL OR t.divisionId = :divisionId)
                AND (:format IS NULL OR t.format = :format)
                AND (:gender IS NULL OR t.gender = :gender)
                AND (:season IS NULL OR t.season = :season)
                AND (:clubId IS NULL OR t.clubId = :clubId)
                AND (:idsSize = 0 OR t.id IN :ids)
                AND (:active IS NULL OR t.active = :active)
            ORDER BY t.name ASC
            """)
    List<Team> findFiltered(@Param("name") String name,
            @Param("divisionId") Long divisionId,
            @Param("format") Format format,
            @Param("gender") Gender gender,
            @Param("season") String season,
            @Param("clubId") String clubId,
            @Param("ids") List<Long> ids,
            @Param("idsSize") int idsSize,
            @Param("active") Boolean active);

}