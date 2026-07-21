package com.blockout.pools.pool.infrastructure.persistence.repositories;

import com.blockout.pools.pool.infrastructure.persistence.entities.PoolEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Persistence operations required by the Pool application service.
 */
public interface PoolRepository extends JpaRepository<PoolEntity, Long> {
    List<PoolEntity> findByLeagueCodeAndActive(String leagueCode, Boolean active);

    @Query("""
        SELECT pool FROM PoolEntity pool
        WHERE (:leagueCode IS NULL OR pool.leagueCode = :leagueCode)
          AND (:season IS NULL OR pool.season = :season)
          AND (:active IS NULL OR pool.active = :active)
          AND (:idsSize = 0 OR pool.id IN :ids)
        ORDER BY pool.season DESC, pool.name ASC
        """)
    List<PoolEntity> findFiltered(
        @Param("leagueCode") String leagueCode, @Param("season") String season,
        @Param("active") Boolean active, @Param("ids") List<Long> ids, @Param("idsSize") int idsSize);
}
