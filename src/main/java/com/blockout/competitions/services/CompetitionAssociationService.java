package com.blockout.competitions.services;

import com.blockout.competitions.models.Category;
import com.blockout.competitions.models.CompetitionAssociation;
import com.blockout.competitions.models.dto.TeamAssociationStatsRequest;
import com.blockout.competitions.repositories.CompetitionAssociationRepository;

import jakarta.persistence.EntityNotFoundException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
public class CompetitionAssociationService {

    private static final Logger logger = LoggerFactory.getLogger(CompetitionAssociationService.class);

    @Autowired
    private CompetitionAssociationRepository associationRepository;

    @Autowired
    private EventPublisher eventPublisher;

    /**
     * Crée ou réactive l'association entre une pool et une team.
     */
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
     * Récupère toutes les associations actives (team ↔ pool) pour une pool donnée.
     */
    public List<CompetitionAssociation> getActiveAssociationsByPool(Long poolId) {
        return associationRepository.findByPoolIdAndActive(poolId, true);
    }

    /**
     * Récupère toutes les associations actives (team ↔ pool) pour une team donnée.
     */
    public List<CompetitionAssociation> getActivePoolsByTeam(Long teamId) {
        return associationRepository.findByTeamIdAndActive(teamId, true);
    }

    /**
     * Désactive toutes les associations actives qui ne figurent plus
     * dans la liste 'scrapedTeamIds' fournie.
     */
    public void bulkDeactivateTeamsForPool(Long poolId, List<Long> scrapedTeamIds) {
        Set<Long> scrapedTeamIdsSet = new HashSet<>(scrapedTeamIds);

        // Récupérer les associations à désactiver en bloc
        List<CompetitionAssociation> toDeactivate = associationRepository.findByPoolIdAndActiveTrueAndTeamIdNotIn(poolId, scrapedTeamIdsSet);
        
        if (toDeactivate.isEmpty()) {
            return;
        }

        for (CompetitionAssociation assoc : toDeactivate) {
            assoc.setActive(false);
        }
        associationRepository.saveAll(toDeactivate);

        logger.info("Associations deactivated in bulk for pool",
                keyValue("action", "bulk_deactivate_associations"),
                keyValue("poolId", poolId),
                keyValue("deactivatedCount", toDeactivate.size()));

        // Determiner les teams totalement inactives
        Set<Long> deactivatedTeamIds = toDeactivate.stream()
                .map(CompetitionAssociation::getTeamId)
                .collect(Collectors.toSet());

        // Savoir lesquelles restent actives
        List<Long> stillActiveTeamIds = associationRepository.findDistinctTeamIdByTeamIdInAndActive(deactivatedTeamIds, true);

        deactivatedTeamIds.removeAll(stillActiveTeamIds);

        for (Long teamId : deactivatedTeamIds) {
            eventPublisher.publishTeamDeactivationEvent(teamId);

            logger.info("Team deactivation event published after bulk deactivate",
                    keyValue("action", "publish_team_deactivation"),
                    keyValue("teamId", teamId),
                    keyValue("poolId", poolId));
        }
    }

    /**
     * Désactive toutes les associations dont le poolId
     * ne figure pas dans 'scrapedPoolIds'.
     */
    public void bulkDeactivatePools(Category category, List<Long> scrapedPoolIds) {
        Set<Long> validPoolIds = new HashSet<>(scrapedPoolIds);

        List<CompetitionAssociation> toDeactivate = associationRepository.findByCategoryAndActiveTrueAndPoolIdNotIn(category, validPoolIds);
        
        if (toDeactivate.isEmpty()) {
            return;
        }

        for (CompetitionAssociation assoc : toDeactivate) {
            assoc.setActive(false);
        }
        associationRepository.saveAll(toDeactivate);

        logger.info("Associations deactivated in bulk for pools",
                keyValue("action", "bulk_deactivate_associations"),
                keyValue("deactivatedCount", toDeactivate.size()));

        // Récupérer la liste des poolIds désactivés
        Set<Long> deactivatedPoolIds = toDeactivate.stream()
                .map(CompetitionAssociation::getPoolId)
                .collect(Collectors.toSet());

        // Vérifier lesquelles restent actives
        List<Long> stillActivePools = associationRepository.findDistinctPoolIdByPoolIdInAndActive(deactivatedPoolIds, true);

        deactivatedPoolIds.removeAll(stillActivePools);

        for (Long poolId : deactivatedPoolIds) {
            eventPublisher.publishPoolDeactivationEvent(poolId);

            logger.info("Pool deactivation event published after bulk deactivate",
                    keyValue("action", "publish_pool_deactivation"),
                    keyValue("poolId", poolId));
        }
    }

    /**
     * Met à jour les statistiques de l'association (pool–team).
     */
    public CompetitionAssociation updateTeamAssociationStats(Long poolId, Long teamId, TeamAssociationStatsRequest request) {
        CompetitionAssociation assoc = associationRepository.findByPoolIdAndTeamId(poolId, teamId)
                .orElseThrow(() -> new EntityNotFoundException("Association not found for poolId " + poolId + " and teamId " + teamId));

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
        if(!assoc.getActive()) {
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