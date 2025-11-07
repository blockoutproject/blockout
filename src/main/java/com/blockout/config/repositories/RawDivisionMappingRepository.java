package com.blockout.config.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.blockout.config.models.entity.RawDivisionMapping;

import java.util.List;

@Repository
public interface RawDivisionMappingRepository extends JpaRepository<RawDivisionMapping, Long> {

    @Query("""
            SELECT r
            FROM RawDivisionMapping r
            WHERE (:leagueCode IS NULL OR r.leagueCode = :leagueCode)
                AND (:season IS NULL OR r.season = :season)
            """)
    List<RawDivisionMapping> findByLeagueCodeAndSeason(
            @Param("leagueCode") String leagueCode,
            @Param("season") String season);
}