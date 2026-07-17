package com.blockout.competitions.association.persistence;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CompetitionAssociationRepository extends JpaRepository<CompetitionAssociationEntity, Long> {

    List<CompetitionAssociationEntity> findByPoolIdAndActive(Long poolId, Boolean active);

    List<CompetitionAssociationEntity> findByTeamIdAndActive(Long teamId, Boolean active);

    Optional<CompetitionAssociationEntity> findByPoolIdAndTeamId(Long poolId, Long teamId);

    Page<CompetitionAssociationEntity> findByPoolIdAndActiveTrue(Long poolId, Pageable pageable);

    Page<CompetitionAssociationEntity> findByTeamIdAndActiveTrue(Long teamId, Pageable pageable);

    boolean existsByPoolIdAndActiveTrue(Long poolId);

    boolean existsByTeamIdAndActiveTrue(Long teamId);

    boolean existsByClubIdAndActiveTrue(String clubId);

    List<CompetitionAssociationEntity> findByPoolIdAndActiveTrueAndTeamIdIn(Long poolId, Set<Long> teamIds);

    List<CompetitionAssociationEntity> findByActiveTrueAndPoolIdIn(Set<Long> poolIds);

    List<CompetitionAssociationEntity> findByActiveTrueAndClubIdIn(Set<String> clubIds);

    @Query("""
            SELECT DISTINCT ca.teamId
            FROM CompetitionAssociationEntity ca
            WHERE ca.poolId IN :poolIds
            """)
    List<Long> findDistinctTeamIdByActiveTrueAndPoolIdIn(@Param("poolIds") Set<Long> poolIds);

    @Query("""
            SELECT DISTINCT ca.clubId
            FROM CompetitionAssociationEntity ca
            WHERE ca.teamId IN :teamIds
            """)
    List<String> findDistinctClubIdByActiveTrueAndTeamIdIn(@Param("teamIds") Set<Long> teamIds);
}
