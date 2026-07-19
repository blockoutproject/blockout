package com.blockout.competitions.association.application;

import com.blockout.competitions.association.application.commands.UpdateAssociationStatsCommand;
import com.blockout.competitions.association.application.exceptions.CompetitionAssociationNotFoundException;
import com.blockout.competitions.association.application.ports.CompetitionDeactivationPublisher;
import com.blockout.competitions.association.application.views.CompetitionAssociationView;
import com.blockout.competitions.association.application.views.PoolWithRankingView;
import com.blockout.competitions.association.application.views.TeamRankingView;
import com.blockout.competitions.association.infrastructure.persistence.entities.CompetitionAssociationEntity;
import com.blockout.competitions.association.infrastructure.persistence.repositories.CompetitionAssociationRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/** Transactional application service for V1 competition associations. */
@Service
@RequiredArgsConstructor
public class CompetitionAssociationApplicationService implements CompetitionAssociationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CompetitionAssociationApplicationService.class);

    private final CompetitionAssociationRepository associationRepository;
    private final CompetitionDeactivationPublisher deactivationPublisher;

    @Override
    @Transactional
    public CompetitionAssociationView addOrReactivateAssociation(Long poolId, Long teamId, String clubId) {
        CompetitionAssociationEntity association = associationRepository.findByPoolIdAndTeamId(poolId, teamId)
                .map(existing -> reactivate(existing, poolId, teamId))
                .orElseGet(() -> createAssociation(poolId, teamId, clubId));
        return toView(association);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompetitionAssociationView> getActiveAssociationsByPool(Long poolId) {
        return associationRepository.findByPoolIdAndActive(poolId, true).stream().map(this::toView).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompetitionAssociationView> getActiveAssociationsByTeam(Long teamId) {
        return associationRepository.findByTeamIdAndActive(teamId, true).stream().map(this::toView).toList();
    }

    @Override
    @Transactional
    public void bulkDeactivateTeamsByPool(Long poolId, List<Long> teamIdsToDeactivate) {
        Set<Long> teamIds = new HashSet<>(teamIdsToDeactivate);
        List<CompetitionAssociationEntity> associations =
                associationRepository.findByPoolIdAndActiveTrueAndTeamIdIn(poolId, teamIds);
        if (associations.isEmpty()) return;

        deactivate(associations);
        Set<Long> deactivatedTeamIds = associations.stream()
                .map(CompetitionAssociationEntity::getTeamId)
                .collect(Collectors.toSet());
        deactivatedTeamIds.forEach(teamId -> deactivationPublisher.publishTeamDeactivationByPool(teamId, poolId));
        cascadeDeactivation(Set.of(poolId), deactivatedTeamIds, Collections.emptySet());
    }

    @Override
    @Transactional
    public void bulkDeactivatePools(List<Long> poolIdsToDeactivate) {
        Set<Long> poolIds = new HashSet<>(poolIdsToDeactivate);
        List<CompetitionAssociationEntity> associations = associationRepository.findByActiveTrueAndPoolIdIn(poolIds);
        if (associations.isEmpty()) return;

        deactivate(associations);
        Set<Long> teamIds = associations.stream()
                .map(CompetitionAssociationEntity::getTeamId)
                .collect(Collectors.toSet());
        cascadeDeactivation(poolIds, teamIds, Collections.emptySet());
    }

    @Override
    @Transactional
    public void bulkDeactivateClubs(List<String> clubIdsToDeactivate) {
        Set<String> clubIds = new HashSet<>(clubIdsToDeactivate);
        List<CompetitionAssociationEntity> associations = associationRepository.findByActiveTrueAndClubIdIn(clubIds);
        if (associations.isEmpty()) return;

        deactivate(associations);
        Set<Long> poolIds = associations.stream()
                .map(CompetitionAssociationEntity::getPoolId)
                .collect(Collectors.toSet());
        Set<Long> teamIds = associations.stream()
                .map(CompetitionAssociationEntity::getTeamId)
                .collect(Collectors.toSet());
        cascadeDeactivation(poolIds, teamIds, clubIds);
    }

    @Override
    @Transactional
    public CompetitionAssociationView updateTeamAssociationStats(
            Long poolId, Long teamId, UpdateAssociationStatsCommand command) {
        CompetitionAssociationEntity association = associationRepository.findByPoolIdAndTeamId(poolId, teamId)
                .orElseThrow(() -> new CompetitionAssociationNotFoundException(teamId, poolId));
        applyStats(association, command);
        CompetitionAssociationEntity saved = associationRepository.save(association);
        LOGGER.info("Updated competition association statistics",
                keyValue("action", "update_association_stats"),
                keyValue("associationId", saved.getId()));
        return toView(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PoolWithRankingView> getPoolsAndRankingsByTeam(Long teamId) {
        Set<Long> poolIds = associationRepository.findByTeamIdAndActive(teamId, true).stream()
                .map(CompetitionAssociationEntity::getPoolId)
                .collect(Collectors.toSet());
        if (poolIds.isEmpty()) return List.of();

        Map<Long, List<CompetitionAssociationEntity>> byPool =
                associationRepository.findByActiveTrueAndPoolIdIn(poolIds).stream()
                        .collect(Collectors.groupingBy(CompetitionAssociationEntity::getPoolId));
        return byPool.entrySet().stream()
                .map(entry -> new PoolWithRankingView(entry.getKey(), entry.getValue().stream()
                        .map(this::toRankingView)
                        .toList()))
                .toList();
    }

    private CompetitionAssociationEntity reactivate(
            CompetitionAssociationEntity association, Long poolId, Long teamId) {
        if (Boolean.TRUE.equals(association.getActive())) return association;
        association.setActive(true);
        LOGGER.info("Reactivated competition association",
                keyValue("action", "reactivate_association"),
                keyValue("poolId", poolId),
                keyValue("teamId", teamId));
        return associationRepository.save(association);
    }

    private CompetitionAssociationEntity createAssociation(Long poolId, Long teamId, String clubId) {
        CompetitionAssociationEntity saved = associationRepository.save(CompetitionAssociationEntity.builder()
                .poolId(poolId)
                .teamId(teamId)
                .clubId(clubId)
                .active(true)
                .build());
        LOGGER.info("Created competition association",
                keyValue("action", "create_association"),
                keyValue("poolId", poolId),
                keyValue("teamId", teamId),
                keyValue("clubId", clubId));
        return saved;
    }

    private void deactivate(List<CompetitionAssociationEntity> associations) {
        associations.forEach(association -> association.setActive(false));
        associationRepository.saveAll(associations);
        LOGGER.info("Deactivated competition associations",
                keyValue("action", "bulk_deactivate_associations"),
                keyValue("count", associations.size()));
    }

    private void cascadeDeactivation(
            Set<Long> candidatePoolIds, Set<Long> candidateTeamIds, Set<String> candidateClubIds) {
        Set<Long> poolIds = new HashSet<>(candidatePoolIds);
        Set<Long> teamIds = new HashSet<>(candidateTeamIds);
        Set<String> clubIds = new HashSet<>(candidateClubIds);

        poolIds.stream()
                .filter(poolId -> !associationRepository.existsByPoolIdAndActiveTrue(poolId))
                .forEach(deactivationPublisher::publishPoolDeactivation);

        if (teamIds.isEmpty() && !poolIds.isEmpty()) {
            teamIds.addAll(associationRepository.findDistinctTeamIdsByPoolIds(poolIds));
        }
        teamIds.stream()
                .filter(teamId -> !associationRepository.existsByTeamIdAndActiveTrue(teamId))
                .forEach(deactivationPublisher::publishTeamDeactivation);

        if (clubIds.isEmpty() && !teamIds.isEmpty()) {
            clubIds.addAll(associationRepository.findDistinctClubIdsByTeamIds(teamIds));
        }
        clubIds.stream()
                .filter(clubId -> !associationRepository.existsByClubIdAndActiveTrue(clubId))
                .forEach(deactivationPublisher::publishClubDeactivation);
    }

    private void applyStats(CompetitionAssociationEntity association, UpdateAssociationStatsCommand command) {
        association.setPlayed(command.played());
        association.setWins(command.wins());
        association.setLosses(command.losses());
        association.setPoints(command.points());
        association.setWinsThreeToZero(command.winsThreeToZero());
        association.setWinsThreeToOne(command.winsThreeToOne());
        association.setWinsThreeToTwo(command.winsThreeToTwo());
        association.setLossesZeroToThree(command.lossesZeroToThree());
        association.setLossesOneToThree(command.lossesOneToThree());
        association.setLossesTwoToThree(command.lossesTwoToThree());
        association.setWonSets(command.wonSets());
        association.setLostSets(command.lostSets());
        association.setWonPoints(command.wonPoints());
        association.setLostPoints(command.lostPoints());
        association.setPointsPenalty(command.pointsPenalty());
        association.setCoefSets(command.coefSets());
        association.setCoefPoints(command.coefPoints());
    }

    private CompetitionAssociationView toView(CompetitionAssociationEntity entity) {
        return new CompetitionAssociationView(
                entity.getId(), entity.getPoolId(), entity.getTeamId(), entity.getClubId(), entity.getActive(),
                entity.getPoints(), entity.getPlayed(), entity.getWins(), entity.getLosses(),
                entity.getWinsThreeToZero(), entity.getWinsThreeToOne(), entity.getWinsThreeToTwo(),
                entity.getLossesZeroToThree(), entity.getLossesOneToThree(), entity.getLossesTwoToThree(),
                entity.getWonSets(), entity.getLostSets(), entity.getWonPoints(), entity.getLostPoints(),
                entity.getPointsPenalty(), entity.getCoefSets(), entity.getCoefPoints(),
                entity.getCreatedAt(), entity.getLastUpdate());
    }

    private TeamRankingView toRankingView(CompetitionAssociationEntity entity) {
        return new TeamRankingView(
                entity.getTeamId(), entity.getPoints(), entity.getPointsPenalty(), entity.getPlayed(),
                entity.getWins(), entity.getLosses(), entity.getCoefSets(), entity.getCoefPoints());
    }
}
