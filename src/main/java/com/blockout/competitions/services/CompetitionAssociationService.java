package com.blockout.competitions.services;

import com.blockout.competitions.exceptions.CompetitionAssociationNotFoundException;
import com.blockout.competitions.models.CompetitionAssociation;
import com.blockout.competitions.models.dto.PoolWithRankingDTO;
import com.blockout.competitions.models.dto.TeamAssociationStatsRequest;
import com.blockout.competitions.models.dto.TeamRankingDTO;
import com.blockout.competitions.repositories.CompetitionAssociationRepository;
import com.blockout.competitions.utils.DiffUtils;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class CompetitionAssociationService {

    private static final Logger logger = LoggerFactory.getLogger(CompetitionAssociationService.class);

    private final CompetitionAssociationRepository associationRepository;
    private final EventPublisher eventPublisher;

    /**
     * Crée ou réactive l'association entre une pool et une team
     *
     * @param poolId L'identifiant de la pool
     * @param teamId L'identifiant de la team
     * @return L'association créée ou réactivée
     */
    @Transactional
    public CompetitionAssociation addOrReactivateAssociation(Long poolId, Long teamId, String clubId) {
        return associationRepository.findByPoolIdAndTeamId(poolId, teamId)
                .map(existing -> {
                    if (!Boolean.TRUE.equals(existing.getActive())) {
                        existing.setActive(true);
                        logger.info("Association reactivated",
                                keyValue("action", "reactivate_association"),
                                keyValue("poolId", poolId),
                                keyValue("teamId", teamId),
                                keyValue("clubId", clubId));
                        return associationRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    CompetitionAssociation newAssoc = CompetitionAssociation.builder()
                            .poolId(poolId)
                            .teamId(teamId)
                            .clubId(clubId)
                            .active(true)
                            .points(0)
                            .build();

                    CompetitionAssociation saved = associationRepository.save(newAssoc);

                    logger.info("New association created",
                            keyValue("action", "create_association"),
                            keyValue("poolId", poolId),
                            keyValue("teamId", teamId),
                            keyValue("clubId", clubId));

                    return saved;
                });
    }

    /**
     * Récupère toutes les associations actives pour une pool donnée
     *
     * @param poolId L'identifiant de la pool
     * @return Liste des associations actives de la pool
     */
    public List<CompetitionAssociation> getActiveAssociationsByPool(Long poolId) {
        return associationRepository.findByPoolIdAndActive(poolId, true);
    }

    /**
     * Récupère toutes les associations actives pour une team donnée
     *
     * @param teamId L'identifiant de la team
     * @return Liste des associations actives de la team
     */
    public List<CompetitionAssociation> getActiveAssociationsByTeam(Long teamId) {
        return associationRepository.findByTeamIdAndActive(teamId, true);
    }

    /**
     * Désactive les associations qui ne figurent plus dans la liste des teams
     *
     * @param poolId L'identifiant de la pool
     * @param teamIdsToDeactivate Liste des identifiants de teams encore actives
     */
    @Transactional
    public void bulkDeactivateTeamsByPool(Long poolId, List<Long> teamIdsToDeactivate) {
        Set<Long> toDeactivate = new HashSet<>(teamIdsToDeactivate);
        logger.info("Démarrage de la désactivation en masse des teams pour la pool",
                keyValue("action", "bulk_deactivate_teams_by_pool"),
                keyValue("poolId", poolId),
                keyValue("teamIdsToDeactivate", toDeactivate));

        var associations = associationRepository.findByPoolIdAndActiveTrueAndTeamIdIn(poolId, toDeactivate);

        if (associations.isEmpty()) {
            logger.info("Aucune association trouvée à désactiver pour la pool", keyValue("poolId", poolId));
            return;
        }

        associations.forEach(a -> {
            a.setActive(false);
            logger.info("Association désactivée par teams et pool",
                    keyValue("action", "deactivate_association"),
                    keyValue("poolId", poolId),
                    keyValue("teamId", a.getTeamId()));
        });

        associationRepository.saveAll(associations);

        var deactivatedTeams = associations.stream().map(CompetitionAssociation::getTeamId).collect(Collectors.toSet());

        for (Long teamId : deactivatedTeams) {
            eventPublisher.publishTeamDeactivationByPoolEvent(teamId, poolId);
            logger.info("Événement de désactivation de team par pool publié",
                    keyValue("action", "publish_team_deactivation_by_pool"),
                    keyValue("teamId", teamId),
                    keyValue("poolId", poolId));
        }

        cascadeDeactivation(Set.of(poolId), deactivatedTeams, Collections.emptySet());
    }

    /**
     * Désactive les associations dont le poolId figure dans la liste
     *
     * @param poolIdsToDeactivate Liste des identifiants de pools à désactiver
     */
    @Transactional
    public void bulkDeactivatePools(List<Long> poolIdsToDeactivate) {
        Set<Long> toDeactivate = new HashSet<>(poolIdsToDeactivate);
        logger.info("Démarrage de la désactivation en masse des pools",
                keyValue("action", "bulk_deactivate_pools"),
                keyValue("poolIdsToDeactivate", toDeactivate));

        var associations = associationRepository.findByActiveTrueAndPoolIdIn(toDeactivate);

        if (associations.isEmpty()) {
            logger.warn("Aucune association trouvée à désactiver pour les pools",
                    keyValue("action", "bulk_deactivate_pools"),
                    keyValue("nombreAssociations", 0));
            return;
        }

        associations.forEach(a -> {
            a.setActive(false);
            logger.info("Association désactivée par pool",
                    keyValue("action", "deactivate_association"),
                    keyValue("poolId", a.getPoolId()),
                    keyValue("teamId", a.getTeamId()));
        });

        associationRepository.saveAll(associations);

        Set<Long> affectedTeams = associations.stream().map(CompetitionAssociation::getTeamId)
                .collect(Collectors.toSet());

        cascadeDeactivation(toDeactivate, affectedTeams, Collections.emptySet());
    }

    /**
     * Désactive les associations dont le clubId figure dans la liste
     *
     * @param clubIdsToDeactivate Liste des identifiants de clubs à désactiver
     */
    @Transactional
    public void bulkDeactivateClubs(List<String> clubIdsToDeactivate) {
        Set<String> toDeactivate = new HashSet<>(clubIdsToDeactivate);
        logger.info("Démarrage de la désactivation en masse des clubs",
                keyValue("action", "bulk_deactivate_clubs"),
                keyValue("clubIdsToDeactivate", toDeactivate));

        var associations = associationRepository.findByActiveTrueAndClubIdIn(toDeactivate);

        if (associations.isEmpty()) {
            logger.warn("Aucune association trouvée à désactiver pour les clubs",
                    keyValue("action", "bulk_deactivate_clubs"),
                    keyValue("nombreAssociations", 0));
            return;
        }

        associations.forEach(a -> {
            a.setActive(false);
            logger.info("Association désactivée par club",
                    keyValue("action", "deactivate_association"),
                    keyValue("poolId", a.getPoolId()),
                    keyValue("clubId", a.getClubId()));
        });

        associationRepository.saveAll(associations);

        Set<Long> pools = associations.stream().map(CompetitionAssociation::getPoolId).collect(Collectors.toSet());
        Set<Long> teams = associations.stream().map(CompetitionAssociation::getTeamId).collect(Collectors.toSet());

        cascadeDeactivation(pools, teams, toDeactivate);
    }

    /**
     * Met à jour les statistiques d'une association pool-team
     *
     * @param poolId  L'identifiant de la pool
     * @param teamId  L'identifiant de la team
     * @param request Les nouvelles statistiques à mettre à jour
     * @return L'association mise à jour
     * @throws EntityNotFoundException Si l'association n'existe pas
     */
    @Transactional
    public CompetitionAssociation updateTeamAssociationStats(Long poolId,
            Long teamId,
            TeamAssociationStatsRequest request) {
        return associationRepository.findByPoolIdAndTeamId(poolId, teamId)
                .map(assoc -> {
                    CompetitionAssociation before = assoc.toBuilder().build();

                    assoc.setPlayed(request.getPlayed());
                    assoc.setWins(request.getWins());
                    assoc.setLosses(request.getLosses());
                    assoc.setPoints(request.getPoints());
                    assoc.setWinsThreeToZero(request.getWinsThreeToZero());
                    assoc.setLossesZeroToThree(request.getLossesZeroToThree());
                    assoc.setWinsThreeToOne(request.getWinsThreeToOne());
                    assoc.setLossesOneToThree(request.getLossesOneToThree());
                    assoc.setWinsThreeToTwo(request.getWinsThreeToTwo());
                    assoc.setLossesTwoToThree(request.getLossesTwoToThree());
                    assoc.setWonSets(request.getWonSets());
                    assoc.setLostSets(request.getLostSets());
                    assoc.setWonPoints(request.getWonPoints());
                    assoc.setLostPoints(request.getLostPoints());
                    assoc.setPointsPenalty(request.getPointsPenalty());
                    assoc.setCoefSets(request.getCoefSets());
                    assoc.setCoefPoints(request.getCoefPoints());

                    CompetitionAssociation savedAssoc = associationRepository.save(assoc);

                    DiffUtils.logChanges(before, savedAssoc, logger,
                            "update_association_stats", savedAssoc.getId());
                    return savedAssoc;
                })
                .orElseThrow(() -> new CompetitionAssociationNotFoundException(teamId, poolId));
    }

    public List<PoolWithRankingDTO> getPoolsAndRankingsByTeam(Long teamId) {
        List<CompetitionAssociation> teamAssocs = associationRepository.findByTeamIdAndActive(teamId, true);

        Set<Long> poolIds = teamAssocs.stream()
                .map(CompetitionAssociation::getPoolId)
                .collect(Collectors.toSet());

        if (poolIds.isEmpty()) {
            return List.of();
        }

        List<CompetitionAssociation> allAssocs = associationRepository.findByActiveTrueAndPoolIdIn(poolIds);

        Map<Long, List<CompetitionAssociation>> groupedByPool = allAssocs.stream()
                .collect(Collectors.groupingBy(CompetitionAssociation::getPoolId));

        List<PoolWithRankingDTO> result = groupedByPool.entrySet().stream()
                .map(entry -> {
                    Long poolId = entry.getKey();
                    List<CompetitionAssociation> assocs = entry.getValue();

                    List<TeamRankingDTO> ranking = assocs.stream()
                            .map(assoc -> TeamRankingDTO.builder()
                                    .teamId(assoc.getTeamId())
                                    .points(assoc.getPoints())
                                    .pointsPenalty(assoc.getPointsPenalty())
                                    .played(assoc.getPlayed())
                                    .wins(assoc.getWins())
                                    .losses(assoc.getLosses())
                                    .coefSets(assoc.getCoefSets())
                                    .coefPoints(assoc.getCoefPoints())
                                    .build())
                            .sorted(Comparator
                                    .comparingInt(TeamRankingDTO::getPoints)
                                    .thenComparingInt(TeamRankingDTO::getPointsPenalty).reversed()
                                    .thenComparingInt(TeamRankingDTO::getWins)
                                    .thenComparingDouble(TeamRankingDTO::getCoefSets)
                                    .thenComparingDouble(TeamRankingDTO::getCoefPoints))
                            .toList();

                    return PoolWithRankingDTO.builder()
                            .poolId(poolId)
                            .ranking(ranking)
                            .build();
                })
                .toList();

        return result;
    }

    /**
     * Cascade complète après désactivation d’associations.
     */
    private void cascadeDeactivation(Set<Long> candidatePoolIds, Set<Long> candidateTeamIds,
            Set<String> candidateClubIds) {

        Set<Long> pools = new HashSet<>(candidatePoolIds);
        Set<Long> teams = new HashSet<>(candidateTeamIds);
        Set<String> clubs = new HashSet<>(candidateClubIds);

        for (Long poolId : pools) {
            if (!associationRepository.existsByPoolIdAndActiveTrue(poolId)) {
                eventPublisher.publishPoolDeactivationEvent(poolId);
                logger.info("Événement de désactivation de pool publié",
                        keyValue("action", "publish_pool_deactivation"),
                        keyValue("poolId", poolId));
            }
        }

        if (teams.isEmpty() && !pools.isEmpty()) {
            teams.addAll(associationRepository.findDistinctTeamIdByActiveTrueAndPoolIdIn(pools));
        }
        for (Long teamId : teams) {
            if (!associationRepository.existsByTeamIdAndActiveTrue(teamId)) {
                eventPublisher.publishTeamDeactivationEvent(teamId);
                logger.info("Événement de désactivation de team publié",
                        keyValue("action", "publish_team_deactivation"),
                        keyValue("teamId", teamId));
            }
        }

        if (clubs.isEmpty() && !teams.isEmpty()) {
            clubs.addAll(associationRepository.findDistinctClubIdByActiveTrueAndTeamIdIn(teams));
        }
        for (String clubId : clubs) {
            if (!associationRepository.existsByClubIdAndActiveTrue(clubId)) {
                eventPublisher.publishClubDeactivationEvent(clubId);
                logger.info("Événement de désactivation de club publié",
                        keyValue("action", "publish_club_deactivation"),
                        keyValue("clubId", clubId));
            }
        }
    }
}