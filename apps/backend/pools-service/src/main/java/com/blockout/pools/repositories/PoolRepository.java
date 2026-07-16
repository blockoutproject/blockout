package com.blockout.pools.repositories;

import com.blockout.pools.models.Pool;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PoolRepository extends JpaRepository<Pool, Long> {

    List<Pool> findByLeagueCodeAndActive(String leagueCode, Boolean active);

    @Query("""
            SELECT p
            FROM Pool p
            WHERE (:leagueCode IS NULL OR p.leagueCode = :leagueCode)
                AND (:season     IS NULL OR p.season     = :season)
                AND (:active     IS NULL OR p.active     = :active)
                AND (:idsSize = 0 OR p.id IN :ids)
            ORDER BY p.season DESC, p.name ASC
            """)
    List<Pool> findFiltered(@Param("leagueCode") String leagueCode,
            @Param("season") String season,
            @Param("active") Boolean active,
            @Param("ids") List<Long> ids,
            @Param("idsSize") int idsSize);
}