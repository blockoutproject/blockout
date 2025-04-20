package com.blockout.teams.repositories;

import com.blockout.teams.models.Team;
import com.blockout.teams.models.TeamFormat;
import com.blockout.teams.models.TeamGender;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByDivisionNameAndFormatAndGender(String divisionName, TeamFormat format, TeamGender gender);

    List<Team> findByClubIdAndActiveTrue(String clubId);

    @Query(value = """
            SELECT *
            FROM teams
            WHERE name % :query
            ORDER BY similarity(name, :query) DESC
            LIMIT 20
            """, nativeQuery = true)
    List<Team> fuzzySearchTeams(@Param("query") String query);

    @Query("SELECT DISTINCT t.clubId FROM Team t WHERE t.clubId IS NOT NULL")
    List<String> findDistinctClubIds();

    @Query("""
            SELECT t
            FROM Team t
            WHERE (:name IS NULL OR t.name = :name)
              AND (:divisionName IS NULL OR t.divisionName = :divisionName)
              AND (:format IS NULL OR t.format = :format)
              AND (:gender IS NULL OR t.gender = :gender)
              AND (:idsSize = 0 OR t.id IN :ids)
            ORDER BY t.name ASC
            """)
    List<Team> findFiltered(@Param("name") String name,
            @Param("divisionName") String divisionName,
            @Param("format") TeamFormat format,
            @Param("gender") TeamGender gender,
            @Param("ids") List<Long> ids,
            @Param("idsSize") int idsSize);

}