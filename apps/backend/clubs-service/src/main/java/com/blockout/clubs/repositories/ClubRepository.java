package com.blockout.clubs.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.blockout.clubs.models.entities.Club;

@Repository
public interface ClubRepository extends JpaRepository<Club, String> {
    @Query("""
            SELECT c
            FROM Club c
            WHERE (
                (:idsSize = 0 OR c.id IN :ids)
                AND (:active IS NULL OR c.active = :active)
            )
            ORDER BY c.name ASC
            """)
    List<Club> findFiltered(
            @Param("ids") List<String> ids,
            @Param("idsSize") int idsSize,
            @Param("active") Boolean active);
}