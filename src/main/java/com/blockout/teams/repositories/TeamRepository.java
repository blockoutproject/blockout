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

    @Query(value = """
        SELECT * 
        FROM teams 
        WHERE name % :query 
        ORDER BY similarity(name, :query) DESC 
        LIMIT 20
        """, nativeQuery = true)
    List<Team> fuzzySearchTeams(@Param("query") String query);
}