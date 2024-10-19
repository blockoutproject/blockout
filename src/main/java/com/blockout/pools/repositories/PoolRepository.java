package com.blockout.pools.repositories;

import com.blockout.pools.models.Pool;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PoolRepository extends JpaRepository<Pool, Long> {
}