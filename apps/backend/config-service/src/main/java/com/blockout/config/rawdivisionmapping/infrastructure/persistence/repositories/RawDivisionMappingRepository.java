package com.blockout.config.rawdivisionmapping.infrastructure.persistence.repositories;

import com.blockout.config.rawdivisionmapping.infrastructure.persistence.entities.RawDivisionMappingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/** Persists raw division mappings. */
public interface RawDivisionMappingRepository extends JpaRepository<RawDivisionMappingEntity, Long> {

    /** Lists mappings with optional league and season filters. */
    @Query("""
            SELECT mapping FROM RawDivisionMappingEntity mapping
            WHERE (:leagueCode IS NULL OR mapping.leagueCode = :leagueCode)
              AND (:season IS NULL OR mapping.season = :season)
            """)
    List<RawDivisionMappingEntity> findByLeagueCodeAndSeason(
            @Param("leagueCode") String leagueCode,
            @Param("season") String season);
}
