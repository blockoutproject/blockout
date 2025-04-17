package com.blockout.competitions.repositories;

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

    /*
     * ----------------------------------------------------------------
     * Requêtes simples par identifiant
     * ----------------------------------------------------------------
     */
    List<CompetitionAssociation> findByPoolId(Long poolId);
    List<CompetitionAssociation> findByPoolIdAndActive(Long poolId, Boolean active);
    List<CompetitionAssociation> findByTeamId(Long teamId);
    List<CompetitionAssociation> findByTeamIdAndActive(Long teamId, Boolean active);
    Optional<CompetitionAssociation> findByPoolIdAndTeamId(Long poolId, Long teamId);

    /*
     * ----------------------------------------------------------------
     * Existence d’associations actives
     * ----------------------------------------------------------------
     */
    boolean existsByPoolIdAndActiveTrue(Long poolId);
    boolean existsByTeamIdAndActiveTrue(Long teamId);
    boolean existsByClubIdAndActiveTrue(String clubId);

    /*
     * ----------------------------------------------------------------
     * Bulk désactivations : récupération des associations actives
     * ----------------------------------------------------------------
     */
    List<CompetitionAssociation> findByPoolIdAndActiveTrueAndTeamIdIn(Long poolId, Set<Long> teamIds);
    List<CompetitionAssociation> findByActiveTrueAndPoolIdIn(Set<Long> poolIds);
    List<CompetitionAssociation> findByActiveTrueAndClubIdIn(Set<String> clubIds);

    /*
     * ----------------------------------------------------------------
     * Helpers DISTINCT (cascade : pool ➜ team ➜ club)
     * ----------------------------------------------------------------
     */
    @Query("""
            SELECT DISTINCT ca.teamId
            FROM CompetitionAssociation ca
            WHERE ca.teamId IN :teamIds AND ca.active = :active
            """)
    List<Long> findDistinctTeamIdByTeamIdInAndActive(@Param("teamIds") Set<Long> teamIds, @Param("active") boolean active);

    @Query("""
            SELECT DISTINCT ca.teamId
            FROM CompetitionAssociation ca
            WHERE ca.poolId IN :poolIds
            """)
    List<Long> findDistinctTeamIdByPoolIdIn(@Param("poolIds") Set<Long> poolIds);

    @Query("""
            SELECT DISTINCT ca.clubId
            FROM CompetitionAssociation ca
            WHERE ca.teamId IN :teamIds
            """)
    List<String> findDistinctClubIdByTeamIdIn(@Param("teamIds") Set<Long> teamIds);
}