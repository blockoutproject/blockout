package com.blockout.competitions.association.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.competitions.association.persistence.CompetitionAssociationEntity;
import com.blockout.competitions.association.persistence.CompetitionAssociationPersistenceMapper;
import com.blockout.competitions.association.persistence.CompetitionAssociationRepository;
import com.blockout.competitions.exceptions.CompetitionAssociationNotFoundException;
import com.blockout.competitions.utils.DiffUtils;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompetitionAssociationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CompetitionAssociationService.class);

    private final CompetitionAssociationRepository repository;
    private final CompetitionAssociationPersistenceMapper mapper;

    @Transactional
    public CompetitionAssociationView addOrReactivate(AddCompetitionAssociationCommand command) {
        CompetitionAssociationEntity entity = repository.findByPoolIdAndTeamId(command.poolId(), command.teamId())
                .map(existing -> reactivate(existing, command))
                .orElseGet(() -> create(command));
        return mapper.toView(entity);
    }

    @Transactional(readOnly = true)
    public List<CompetitionAssociationView> findLegacyByPool(Long poolId) {
        return repository.findByPoolIdAndActive(poolId, true).stream().map(mapper::toView).toList();
    }

    @Transactional(readOnly = true)
    public List<CompetitionAssociationView> findLegacyByTeam(Long teamId) {
        return repository.findByTeamIdAndActive(teamId, true).stream().map(mapper::toView).toList();
    }

    @Transactional(readOnly = true)
    public CompetitionAssociationPage findPageByPool(Long poolId, int page, int pageSize) {
        Page<CompetitionAssociationEntity> result = repository.findByPoolIdAndActiveTrue(
                poolId, PageRequest.of(page, pageSize, Sort.by("teamId").ascending()));
        return page(result, page, pageSize);
    }

    @Transactional(readOnly = true)
    public CompetitionAssociationPage findPageByTeam(Long teamId, int page, int pageSize) {
        Page<CompetitionAssociationEntity> result = repository.findByTeamIdAndActiveTrue(
                teamId, PageRequest.of(page, pageSize, Sort.by("poolId").ascending()));
        return page(result, page, pageSize);
    }

    @Transactional
    public CompetitionAssociationView replaceStatistics(
            Long poolId, Long teamId, CompetitionStatisticsSnapshot snapshot) {
        CompetitionAssociationEntity entity = repository.findByPoolIdAndTeamId(poolId, teamId)
                .orElseThrow(() -> new CompetitionAssociationNotFoundException(teamId, poolId));
        CompetitionAssociationEntity before = entity.toBuilder().build();
        mapper.replaceStatistics(snapshot, entity);
        CompetitionAssociationEntity saved = repository.save(entity);
        DiffUtils.logChanges(before, saved, LOGGER, "update_association_stats", saved.getId());
        return mapper.toView(saved);
    }

    private CompetitionAssociationEntity reactivate(
            CompetitionAssociationEntity existing, AddCompetitionAssociationCommand command) {
        if (!Boolean.TRUE.equals(existing.getActive())) {
            existing.setActive(true);
            LOGGER.info("Association reactivated", keyValue("action", "reactivate_association"),
                    keyValue("poolId", command.poolId()), keyValue("teamId", command.teamId()),
                    keyValue("clubId", command.clubId()));
            return repository.save(existing);
        }
        return existing;
    }

    private CompetitionAssociationEntity create(AddCompetitionAssociationCommand command) {
        CompetitionAssociationEntity saved = repository.save(CompetitionAssociationEntity.builder()
                .poolId(command.poolId()).teamId(command.teamId()).clubId(command.clubId()).active(true).points(0)
                .build());
        LOGGER.info("New association created", keyValue("action", "create_association"),
                keyValue("poolId", command.poolId()), keyValue("teamId", command.teamId()),
                keyValue("clubId", command.clubId()));
        return saved;
    }

    private CompetitionAssociationPage page(Page<CompetitionAssociationEntity> result, int page, int pageSize) {
        return new CompetitionAssociationPage(result.getContent().stream().map(mapper::toView).toList(), page,
                pageSize, result.getTotalElements(), result.hasNext());
    }
}
