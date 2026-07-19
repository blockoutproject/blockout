package com.blockout.clubs.club.infrastructure.persistence.repositories;

import com.blockout.clubs.club.infrastructure.persistence.entities.ClubEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Persistence access for the authoritative Club aggregate.
 */
@Repository
public interface ClubRepository extends JpaRepository<ClubEntity, String> {

    /**
     * Applies the existing optional identifier and active-state filters in name order.
     */
    @Query("""
            SELECT c
            FROM ClubEntity c
            WHERE (
                (:idsSize = 0 OR c.id IN :ids)
                AND (:active IS NULL OR c.active = :active)
            )
            ORDER BY c.name ASC
            """)
    List<ClubEntity> findFiltered(
            @Param("ids") List<String> ids,
            @Param("idsSize") int idsSize,
            @Param("active") Boolean active);
}
