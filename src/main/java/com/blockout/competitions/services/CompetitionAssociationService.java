package com.blockout.competitions.services;

import com.blockout.competitions.models.Category;
import com.blockout.competitions.models.CompetitionAssociation;
import com.blockout.competitions.models.dto.TeamAssociationStatsRequest;
import com.blockout.competitions.repositories.CompetitionAssociationRepository;

import jakarta.persistence.EntityNotFoundException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
public class CompetitionAssociationService {

    private static final Logger logger = LoggerFactory.getLogger(CompetitionAssociationService.class);

    private final CompetitionAssociationRepository associationRepository;
    private final EventPublisher eventPublisher;

    public CompetitionAssociationService(CompetitionAssociationRepository associationRepository,
            EventPublisher eventPublisher) {
        this.associationRepository = associationRepository;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Crée ou réactive l'association entre une pool et une team
     * 
     * @param poolId   L'identifiant de la pool
     * @param teamId   L'identifiant de la team
     * @param category La catégorie de l'association
     * @return L'association créée ou réactivée
     */
    @Transactional
    public CompetitionAssociation addOrActivateAssociation(Long poolId, Long teamId, String clubId, Category category) {
        Optional<CompetitionAssociation> existingAssoc = associationRepository.findByPoolIdAndTeamId(poolId, teamId);

        if (existingAssoc.isPresent()) {
            CompetitionAssociation a = existingAssoc.get();
            if (!Boolean.TRUE.equals(a.getActive())) {
                a.setActive(true);

                logger.info("Association reactivated",
                        keyValue("action", "reactivate_association"),
                        keyValue("poolId", poolId),
                        keyValue("teamId", teamId),
                        keyValue("clubId", clubId));

                return associationRepository.save(a);
            }
            return a;
        } else {
            CompetitionAssociation newAssoc = CompetitionAssociation.builder()
                    .poolId(poolId)
                    .teamId(teamId)
                    .clubId(clubId)
                    .category(category)
                    .active(true)
                    .points(0)
                    .build();

            CompetitionAssociation saved = associationRepository.save(newAssoc);

            logger.info("New association created",
                    keyValue("action", "create_association"),
                    keyValue("poolId", poolId),
                    keyValue("teamId", teamId),
                    keyValue("clubId", clubId),
                    keyValue("category", category));

            return saved;
        }
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
     * Récupère toutes les associations pour une pool donnée
     * 
     * @param poolId L'identifiant de la pool
     * @return Liste des associations de la pool
     */
    public List<CompetitionAssociation> getAssociationsByPool(Long poolId) {
        return associationRepository.findByPoolId(poolId);
    }

    /**
     * Récupère toutes les associations actives pour une team donnée
     * 
     * @param teamId L'identifiant de la team
     * @return Liste des associations actives de la team
     */
    public List<CompetitionAssociation> getActivePoolsByTeam(Long teamId) {
        return associationRepository.findByTeamIdAndActive(teamId, true);
    }

    /**
     * Désactive les associations qui ne figurent plus dans la liste des teams
     * 
     * @param poolId              L'identifiant de la pool
     * @param teamIdsToDeactivate Liste des identifiants de teams encore actives
     */
    @Transactional
    public void bulkDeactivateTeamsByPool(Long poolId, List<Long> teamIdsToDeactivate) {
        Set<Long> teamIdsToDeactivateSet = new HashSet<>(teamIdsToDeactivate);
        logger.info("Démarrage de la désactivation en masse des teams pour la pool",
                keyValue("action", "bulk_deactivate_teams"),
                keyValue("poolId", poolId),
                keyValue("teamIdsToDeactivate", teamIdsToDeactivateSet));

        // Récupérer les associations actives dont l'ID de team figure dans la liste à désactiver
        List<CompetitionAssociation> associationsToDeactivate = associationRepository
                .findByPoolIdAndActiveTrueAndTeamIdIn(poolId, teamIdsToDeactivateSet);

        if (associationsToDeactivate.isEmpty()) {
            logger.info("Aucune association trouvée à désactiver pour la pool",
                    keyValue("poolId", poolId));
            return;
        }

        // Désactiver les associations récupérées
        associationsToDeactivate.forEach(a -> a.setActive(false));
        associationRepository.saveAll(associationsToDeactivate);
        logger.info("Associations désactivées en masse pour la pool",
                keyValue("action", "bulk_deactivate_teams_by_pool"),
                keyValue("poolId", poolId),
                keyValue("nombreAssociations", associationsToDeactivate.size()));

        Set<Long> deactivatedTeams = associationsToDeactivate.stream()
                .map(CompetitionAssociation::getTeamId)
                .collect(Collectors.toSet());

        // Publier un événement pour chaque team désactivée dans la poule pour désactiver les matchs concernés
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
     * @param category            La catégorie des pools
     * @param poolIdsToDeactivate Liste des identifiants de pools à désactiver
     */
    @Transactional
    public void bulkDeactivatePools(List<Long> poolIdsToDeactivate) {
        Set<Long> poolIdsToDeactivateSet = new HashSet<>(poolIdsToDeactivate);
        logger.info("Démarrage de la désactivation en masse des pools",
                keyValue("action", "bulk_deactivate_pools"),
                keyValue("poolIdsToDeactivate", poolIdsToDeactivateSet));

        // Récupérer et désactiver les associations actives correspondant aux poolIds fournis
        List<CompetitionAssociation> associationsToDeactivate = associationRepository
                .findByActiveTrueAndPoolIdIn(poolIdsToDeactivateSet);

        if (associationsToDeactivate.isEmpty()) {
            logger.warn("Aucune association trouvée à désactiver pour les pools",
                    keyValue("action", "bulk_deactivate_pools"),
                    keyValue("nombreAssociations", 0));
            // Publier un événement pour chaque pool désactivée
            for (Long poolId : poolIdsToDeactivateSet) {
                if (!associationRepository.existsByPoolIdAndActiveTrue(poolId)) {
                    eventPublisher.publishPoolDeactivationEvent(poolId);
                    logger.info("Événement de désactivation de pool publié",
                            keyValue("action", "publish_pool_deactivation"),
                            keyValue("poolId", poolId));
                }
            }
            return;
        }

        associationsToDeactivate.forEach(a -> a.setActive(false));
        associationRepository.saveAll(associationsToDeactivate);
        logger.info("Associations désactivées en masse pour les pools",
                keyValue("action", "bulk_deactivate_pools"),
                keyValue("nombreAssociations", associationsToDeactivate.size()));

        // Récupérer l'ensemble des teamIds concernées par ces associations désactivées
        Set<Long> affectedTeams = associationsToDeactivate.stream()
                .map(CompetitionAssociation::getTeamId)
                .collect(Collectors.toSet());

        cascadeDeactivation(poolIdsToDeactivateSet, affectedTeams, Collections.emptySet());
    }

    /**
     * Désactive les associations dont le clubId figure dans la liste
     * 
     * @param category            La catégorie des clubs
     * @param clubIdsToDeactivate Liste des identifiants de clubs à désactiver
     */
    @Transactional
    public void bulkDeactivateClubs(List<String> clubIdsToDeactivate) {
        Set<String> clubIdsToDeactivateSet = new HashSet<>(clubIdsToDeactivate);
        logger.info("Démarrage de la désactivation en masse des clubs",
                keyValue("action", "bulk_deactivate_clubs"),
                keyValue("clubIdsToDeactivate", clubIdsToDeactivateSet));

        // Récupérer et désactiver les associations actives correspondant aux clubIds fournis
        List<CompetitionAssociation> associationsToDeactivate = associationRepository
                .findByActiveTrueAndClubIdIn(clubIdsToDeactivateSet);

        if (associationsToDeactivate.isEmpty()) {
            logger.warn("Aucune association trouvée à désactiver pour les clubs",
                    keyValue("action", "bulk_deactivate_clubs"),
                    keyValue("nombreAssociations", 0));
            return;
        }

        associationsToDeactivate.forEach(a -> a.setActive(false));
        associationRepository.saveAll(associationsToDeactivate);
        logger.info("Associations désactivées en masse pour les clubs",
                keyValue("action", "bulk_deactivate_clubs"),
                keyValue("nombreAssociations", associationsToDeactivate.size()));

        Set<Long> affectedPools = associationsToDeactivate.stream()
                .map(CompetitionAssociation::getPoolId)
                .collect(Collectors.toSet());

        Set<Long> affectedTeams = associationsToDeactivate.stream()
                .map(CompetitionAssociation::getTeamId)
                .collect(Collectors.toSet());

        cascadeDeactivation(affectedPools, affectedTeams, clubIdsToDeactivateSet);
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
    public CompetitionAssociation updateTeamAssociationStats(Long poolId, Long teamId, TeamAssociationStatsRequest request) {
        CompetitionAssociation a = associationRepository.findByPoolIdAndTeamId(poolId, teamId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Association not found for poolId " + poolId + " and teamId " + teamId));

        a.setPlayed(request.getPlayed());
        a.setWins(request.getWins());
        a.setLosses(request.getLosses());
        a.setPoints(request.getPoints());
        a.setWins30(request.getWins30());
        a.setLosses03(request.getLosses03());
        a.setWins31(request.getWins31());
        a.setLosses13(request.getLosses13());
        a.setWins32(request.getWins32());
        a.setLosses23(request.getLosses23());
        a.setWonSets(request.getWonSets());
        a.setLostSets(request.getLostSets());
        a.setWonPoints(request.getWonPoints());
        a.setLostPoints(request.getLostPoints());
        a.setPointsPenalty(request.getPointsPenalty());
        a.setCoefSets(request.getCoefSets());
        a.setCoefPoints(request.getCoefPoints());
        if (!a.getActive()) {
            a.setActive(true);
            logger.info("Reactivated team association stats",
                    keyValue("action", "reactivate_association_stats"),
                    keyValue("poolId", poolId),
                    keyValue("teamId", teamId));
        }

        CompetitionAssociation updatedAssoc = associationRepository.save(a);

        logger.info("Updated team association stats",
                keyValue("action", "update_association_stats"),
                keyValue("poolId", poolId),
                keyValue("teamId", teamId),
                keyValue("played", request.getPlayed()),
                keyValue("wins", request.getWins()),
                keyValue("losses", request.getLosses()),
                keyValue("points", request.getPoints()));
        return updatedAssoc;
    }

    /**
     * Cascade complète après désactivation d’associations.
     */
    private void cascadeDeactivation(Set<Long> candidatePoolIds, Set<Long> candidateTeamIds, Set<String> candidateClubIds) {

        Set<Long> pools = new HashSet<>(candidatePoolIds);
        Set<Long> teams = new HashSet<>(candidateTeamIds);
        Set<String> clubs = new HashSet<>(candidateClubIds);

        // Pools
        for (Long poolId : pools) {
            if (!associationRepository.existsByPoolIdAndActiveTrue(poolId)) {
                eventPublisher.publishPoolDeactivationEvent(poolId);
                logger.info("Événement de désactivation de pool publié",
                        keyValue("action", "publish_pool_deactivation"),
                        keyValue("poolId", poolId));
            }
        }

        // Teams
        if (teams.isEmpty() && !pools.isEmpty()) {
            teams.addAll(associationRepository.findDistinctTeamIdByPoolIdIn(pools));
        }
        for (Long teamId : teams) {
            if (!associationRepository.existsByTeamIdAndActiveTrue(teamId)) {
                eventPublisher.publishTeamDeactivationEvent(teamId);
                logger.info("Événement de désactivation de team publié",
                        keyValue("action", "publish_team_deactivation"),
                        keyValue("teamId", teamId));
            }
        }

        // Clubs
        if (clubs.isEmpty() && !teams.isEmpty()) {
            clubs.addAll(associationRepository.findDistinctClubIdByTeamIdIn(teams));
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