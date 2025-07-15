package com.blockout.clubs.repositories;

import com.blockout.clubs.models.Club;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ClubRepository extends JpaRepository<Club, String> {
    @Query("""
            SELECT c
            FROM Club c
            WHERE (:idsSize = 0 OR c.id IN :ids)
            ORDER BY c.name ASC
            """)
    List<Club> findFiltered(@Param("ids") List<String> ids, @Param("idsSize") int idsSize);
}