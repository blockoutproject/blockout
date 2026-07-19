package com.blockout.competitions.association.infrastructure.persistence.repositories;

import com.blockout.competitions.association.infrastructure.persistence.entities.CompetitionAssociationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface CompetitionAssociationRepository extends JpaRepository<CompetitionAssociationEntity, Long> {

    List<CompetitionAssociationEntity> findByPoolIdAndActive(Long poolId, Boolean active);

    List<CompetitionAssociationEntity> findByTeamIdAndActive(Long teamId, Boolean active);

    Optional<CompetitionAssociationEntity> findByPoolIdAndTeamId(Long poolId, Long teamId);

    boolean existsByPoolIdAndActiveTrue(Long poolId);

    boolean existsByTeamIdAndActiveTrue(Long teamId);

    boolean existsByClubIdAndActiveTrue(String clubId);

    List<CompetitionAssociationEntity> findByPoolIdAndActiveTrueAndTeamIdIn(Long poolId, Set<Long> teamIds);

    List<CompetitionAssociationEntity> findByActiveTrueAndPoolIdIn(Set<Long> poolIds);

    List<CompetitionAssociationEntity> findByActiveTrueAndClubIdIn(Set<String> clubIds);

    @Query("SELECT DISTINCT association.teamId FROM CompetitionAssociationEntity association "
            + "WHERE association.poolId IN :poolIds")
    List<Long> findDistinctTeamIdsByPoolIds(@Param("poolIds") Set<Long> poolIds);

    @Query("SELECT DISTINCT association.clubId FROM CompetitionAssociationEntity association "
            + "WHERE association.teamId IN :teamIds")
    List<String> findDistinctClubIdsByTeamIds(@Param("teamIds") Set<Long> teamIds);
}
