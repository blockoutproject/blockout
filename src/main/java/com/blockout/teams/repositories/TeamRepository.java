package com.blockout.teams.repositories;

import com.blockout.teams.models.Team;
import com.blockout.teams.models.enums.DivisionCode;
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
                AND (:divisionCode IS NULL OR t.divisionCode = :divisionCode)
                AND (:format IS NULL OR t.format = :format)
                AND (:gender IS NULL OR t.gender = :gender)
                AND (:clubId IS NULL OR t.clubId = :clubId)
                AND (:idsSize = 0 OR t.id IN :ids)
            ORDER BY t.name ASC
            """)
    List<Team> findFiltered(@Param("name") String name,
            @Param("divisionCode") DivisionCode divisionCode,
            @Param("format") Format format,
            @Param("gender") Gender gender,
            @Param("clubId") String clubId,
            @Param("ids") List<Long> ids,
            @Param("idsSize") int idsSize);

}