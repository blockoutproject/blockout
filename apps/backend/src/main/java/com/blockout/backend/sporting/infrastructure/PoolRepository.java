package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.sporting.application.PoolKey;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Native Spring Data access to the sporting pool owner. */
interface PoolRepository extends JpaRepository<PoolEntity, UUID> {
  /**
   * Resolves the immutable season reference without loading a pool into the persistence context.
   *
   * @param id existing pool identity
   * @return canonical season to lock before reading current sporting state
   */
  @Query("select p.season.id from PoolEntity p where p.id = :id")
  Optional<UUID> findSeasonId(UUID id);

  /**
   * Finds the full native key while preserving absent optional context.
   *
   * @param key complete contextual native key
   * @return matching pool, including absent tour/group
   */
  @Query(
      """
      select p from PoolEntity p where p.provider = :#{#key.provider} and p.season.id = :#{#key.seasonId}
      and p.organizerReference = :#{#key.organizerReference} and p.competitionReference = :#{#key.competitionReference}
      and p.reference = :#{#key.reference}
      and (p.tourReference = :#{#key.tourReference} or (p.tourReference is null and :#{#key.tourReference} is null))
      and (p.groupReference = :#{#key.groupReference} or (p.groupReference is null and :#{#key.groupReference} is null))
      """)
  Optional<PoolEntity> findByKey(PoolKey key);
}
