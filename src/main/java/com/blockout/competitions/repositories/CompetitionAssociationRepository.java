package com.blockout.competitions.repositories;

import com.blockout.competitions.models.Category;
import com.blockout.competitions.models.CompetitionAssociation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface CompetitionAssociationRepository extends JpaRepository<CompetitionAssociation, Long> {

        // Trouver toutes les associations pour une pool
        List<CompetitionAssociation> findByPoolId(Long poolId);

        List<CompetitionAssociation> findByPoolIdAndActive(Long poolId, Boolean active);

        // Trouver toutes les associations pour une team
        List<CompetitionAssociation> findByTeamId(Long teamId);

        List<CompetitionAssociation> findByTeamIdAndActive(Long teamId, Boolean active);

        // Récupère toutes les associations actives
        List<CompetitionAssociation> findByActive(boolean active);

        // Trouver l'association unique entre une pool et une équipe
        Optional<CompetitionAssociation> findByPoolIdAndTeamId(Long poolId, Long teamId);

        List<CompetitionAssociation> findByPoolIdAndActiveTrueAndTeamIdNotIn(Long poolId, Set<Long> teamIds);

        @Query("""
                            SELECT DISTINCT ca.teamId
                            FROM CompetitionAssociation ca
                            WHERE ca.teamId IN :teamIds AND ca.active = :active
                        """)
        List<Long> findDistinctTeamIdByTeamIdInAndActive(
                        @Param("teamIds") Set<Long> teamIds,
                        @Param("active") boolean active);

        List<CompetitionAssociation> findByCategoryAndActiveTrueAndPoolIdNotIn(Category category, Set<Long> poolIds);

        @Query("""
                            SELECT DISTINCT ca.poolId
                            FROM CompetitionAssociation ca
                            WHERE ca.poolId IN :poolIds AND ca.active = :active
                        """)
        List<Long> findDistinctPoolIdByPoolIdInAndActive(
                        @Param("poolIds") Set<Long> poolIds,
                        @Param("active") boolean active);
}