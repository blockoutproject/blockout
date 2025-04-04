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
    public CompetitionAssociation addOrActivateAssociation(Long poolId, Long teamId, Category category) {
        Optional<CompetitionAssociation> existingAssoc = associationRepository.findByPoolIdAndTeamId(poolId, teamId);

        if (existingAssoc.isPresent()) {
            CompetitionAssociation assoc = existingAssoc.get();
            if (!Boolean.TRUE.equals(assoc.getActive())) {
                assoc.setActive(true);

                logger.info("Association reactivated",
                        keyValue("action", "reactivate_association"),
                        keyValue("poolId", poolId),
                        keyValue("teamId", teamId));

                return associationRepository.save(assoc);
            }
            return assoc;
        } else {
            CompetitionAssociation newAssoc = CompetitionAssociation.builder()
                    .poolId(poolId)
                    .teamId(teamId)
                    .category(category)
                    .active(true)
                    .points(0)
                    .build();

            CompetitionAssociation saved = associationRepository.save(newAssoc);

            logger.info("New association created",
                    keyValue("action", "create_association"),
                    keyValue("poolId", poolId),
                    keyValue("teamId", teamId),
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
     * @param poolId L'identifiant de la pool
     * @param teamIdsToDeactivate Liste des identifiants de teams encore actives
     */
    @Transactional
    public void bulkDeactivateTeamsForPool(Long poolId, List<Long> teamIdsToDeactivate) {
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
        associationsToDeactivate.forEach(assoc -> assoc.setActive(false));
        associationRepository.saveAll(associationsToDeactivate);
        logger.info("Associations désactivées en masse pour la pool",
                keyValue("action", "bulk_deactivate_teams"),
                keyValue("poolId", poolId),
                keyValue("nombreAssociations", associationsToDeactivate.size()));

        Set<Long> deactivatedTeamIds = associationsToDeactivate.stream()
                .map(CompetitionAssociation::getTeamId)
                .collect(Collectors.toSet());

        // Publier un événement pour chaque team désactivée dans la poule pour désactiver les matchs concernés
        for (Long teamId : deactivatedTeamIds) {
            eventPublisher.publishTeamDeactivationByPoolEvent(teamId, poolId);
            logger.info("Événement de désactivation de team par pool publié",
                    keyValue("action", "publish_team_deactivation_by_pool"),
                    keyValue("teamId", teamId),
                    keyValue("poolId", poolId));
        }
    
        // Vérifier lesquelles restent actives en dehors de la poule
        List<Long> stillActiveTeamIds = associationRepository.findDistinctTeamIdByTeamIdInAndActive(deactivatedTeamIds, true);
        deactivatedTeamIds.removeAll(stillActiveTeamIds);
    
        // Publier un événement pour chaque team complètement désactivée
        for (Long teamId : deactivatedTeamIds) {
            eventPublisher.publishTeamDeactivationEvent(teamId);
            logger.info("Événement de désactivation de team publié",
                    keyValue("action", "publish_team_deactivation"),
                    keyValue("teamId", teamId),
                    keyValue("poolId", poolId));
        }

        boolean poolHasActiveAssociations = associationRepository.existsByPoolIdAndActiveTrue(poolId);

        // Publier un événement si la poule n'a plus d'équipe active
        if (!poolHasActiveAssociations) {
            eventPublisher.publishPoolDeactivationEvent(poolId);
            logger.info("Événement de désactivation de pool publié",
                    keyValue("action", "publish_pool_deactivation"),
                    keyValue("poolId", poolId));
        }
    }

    /**
     * Désactive les associations dont le poolId ne figure pas dans la liste
     * 
     * @param category La catégorie des pools
     * @param poolIdsToDeactivate Liste des identifiants de pools encore actives
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
            return;
        }
    
        associationsToDeactivate.forEach(assoc -> assoc.setActive(false));
        associationRepository.saveAll(associationsToDeactivate);
        logger.info("Associations désactivées en masse pour les pools",
                keyValue("action", "bulk_deactivate_pools"),
                keyValue("nombreAssociations", associationsToDeactivate.size()));
    
        // Ici, on considère que tous les poolIds fournis sont complètement désactivés.
        for (Long poolId : poolIdsToDeactivateSet) {
            eventPublisher.publishPoolDeactivationEvent(poolId);
            logger.info("Événement de désactivation de pool publié",
                    keyValue("action", "publish_pool_deactivation"),
                    keyValue("poolId", poolId));
        }

        // Récupérer l'ensemble des teamIds concernées par ces associations désactivées
        Set<Long> affectedTeamIds = associationsToDeactivate.stream()
        .map(CompetitionAssociation::getTeamId)
        .collect(Collectors.toSet());
        logger.info("Team IDs affectées détectées", keyValue("affectedTeamIds", affectedTeamIds));

        // Vérifier pour chaque team s'il reste des associations actives
        List<Long> stillActiveTeamIds = associationRepository.findDistinctTeamIdByTeamIdInAndActive(affectedTeamIds, true);
        affectedTeamIds.removeAll(stillActiveTeamIds);

        // Pour chaque team complètement désactivée, publier l'événement correspondant
        for (Long teamId : affectedTeamIds) {
            eventPublisher.publishTeamDeactivationEvent(teamId);
            logger.info("Événement de désactivation de team publié",
                    keyValue("action", "publish_team_deactivation"),
                    keyValue("teamId", teamId));
        }
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
    public CompetitionAssociation updateTeamAssociationStats(Long poolId, Long teamId,
            TeamAssociationStatsRequest request) {
        CompetitionAssociation assoc = associationRepository.findByPoolIdAndTeamId(poolId, teamId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Association not found for poolId " + poolId + " and teamId " + teamId));

        assoc.setPlayed(request.getPlayed());
        assoc.setWins(request.getWins());
        assoc.setLosses(request.getLosses());
        assoc.setPoints(request.getPoints());
        assoc.setWins30(request.getWins30());
        assoc.setLosses03(request.getLosses03());
        assoc.setWins31(request.getWins31());
        assoc.setLosses13(request.getLosses13());
        assoc.setWins32(request.getWins32());
        assoc.setLosses23(request.getLosses23());
        assoc.setWonSets(request.getWonSets());
        assoc.setLostSets(request.getLostSets());
        assoc.setWonPoints(request.getWonPoints());
        assoc.setLostPoints(request.getLostPoints());
        assoc.setPointsPenalty(request.getPointsPenalty());
        assoc.setCoefSets(request.getCoefSets());
        assoc.setCoefPoints(request.getCoefPoints());
        if (!assoc.getActive()) {
            assoc.setActive(true);
            logger.info("Reactivated team association stats",
                    keyValue("action", "reactivate_association_stats"),
                    keyValue("poolId", poolId),
                    keyValue("teamId", teamId));
        }

        CompetitionAssociation updatedAssoc = associationRepository.save(assoc);

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
}