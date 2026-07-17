package com.blockout.clubs.club.persistence;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClubRepository extends JpaRepository<ClubEntity, String> {

    @Query("""
            SELECT c
            FROM ClubEntity c
            WHERE ((:idsSize = 0 OR c.id IN :ids) AND (:active IS NULL OR c.active = :active))
            ORDER BY c.name ASC
            """)
    List<ClubEntity> findFilteredLegacy(
            @Param("ids") List<String> ids,
            @Param("idsSize") int idsSize,
            @Param("active") Boolean active);

    @Query("""
            SELECT c
            FROM ClubEntity c
            WHERE ((:idsSize = 0 OR c.id IN :ids) AND (:active IS NULL OR c.active = :active))
            """)
    Page<ClubEntity> findFiltered(
            @Param("ids") List<String> ids,
            @Param("idsSize") int idsSize,
            @Param("active") Boolean active,
            Pageable pageable);
}
