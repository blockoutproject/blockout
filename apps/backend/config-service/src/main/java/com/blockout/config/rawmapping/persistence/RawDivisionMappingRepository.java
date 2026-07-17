package com.blockout.config.rawmapping.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RawDivisionMappingRepository extends JpaRepository<RawDivisionMappingEntity, Long> {

    @Query("""
            SELECT mapping
            FROM RawDivisionMappingEntity mapping
            WHERE (:leagueCode IS NULL OR mapping.leagueCode = :leagueCode)
                AND (:season IS NULL OR mapping.season = :season)
            """)
    List<RawDivisionMappingEntity> findByLeagueCodeAndSeason(
            @Param("leagueCode") String leagueCode,
            @Param("season") String season);
}
