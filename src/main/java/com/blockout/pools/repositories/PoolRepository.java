package com.blockout.pools.repositories;

import com.blockout.pools.models.Pool;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PoolRepository extends JpaRepository<Pool, Long> {
    Optional<Pool> findByPoolCodeAndLeagueCodeAndSeason(String poolCode, String leagueCode, Integer season);
    List<Pool> findByLeagueCodeAndActive(String leagueCode, Boolean active);
}