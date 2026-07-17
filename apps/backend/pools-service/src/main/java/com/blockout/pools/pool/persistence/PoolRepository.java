package com.blockout.pools.pool.persistence;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PoolRepository extends JpaRepository<PoolEntity, Long> {

    @Query("""
            SELECT p
            FROM PoolEntity p
            WHERE (:leagueCode IS NULL OR p.leagueCode = :leagueCode)
                AND (:season IS NULL OR p.season = :season)
                AND (:active IS NULL OR p.active = :active)
                AND (:idsSize = 0 OR p.id IN :ids)
            ORDER BY p.season DESC, p.name ASC
            """)
    List<PoolEntity> findFilteredLegacy(
            @Param("leagueCode") String leagueCode,
            @Param("season") String season,
            @Param("active") Boolean active,
            @Param("ids") List<Long> ids,
            @Param("idsSize") int idsSize);

    @Query("""
            SELECT p
            FROM PoolEntity p
            WHERE (:leagueCode IS NULL OR p.leagueCode = :leagueCode)
                AND (:season IS NULL OR p.season = :season)
                AND (:active IS NULL OR p.active = :active)
                AND (:idsSize = 0 OR p.id IN :ids)
            """)
    Page<PoolEntity> findFiltered(
            @Param("leagueCode") String leagueCode,
            @Param("season") String season,
            @Param("active") Boolean active,
            @Param("ids") List<Long> ids,
            @Param("idsSize") int idsSize,
            Pageable pageable);
}
