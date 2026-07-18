package com.blockout.competitions.association.persistence;

import com.blockout.competitions.association.application.AddCompetitionAssociationCommand;
import com.blockout.competitions.association.application.CompetitionAssociationActivation;
import com.blockout.competitions.association.application.CompetitionAssociationChange;
import com.blockout.competitions.association.application.CompetitionAssociationPage;
import com.blockout.competitions.association.application.CompetitionAssociationStore;
import com.blockout.competitions.association.application.CompetitionAssociationView;
import com.blockout.competitions.association.application.CompetitionStatisticsSnapshot;
import com.blockout.competitions.association.application.CompetitionStatisticsStore;
import com.blockout.competitions.association.application.CompetitionStatisticsUpdate;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaCompetitionAssociationStore implements CompetitionAssociationStore, CompetitionStatisticsStore {

    private final CompetitionAssociationRepository repository;
    private final CompetitionAssociationPersistenceMapper mapper;

    @Override
    public Optional<CompetitionAssociationActivation> findForActivation(Long poolId, Long teamId) {
        return repository.findByPoolIdAndTeamId(poolId, teamId).map(JpaAssociationActivation::new);
    }

    @Override
    public CompetitionAssociationView create(AddCompetitionAssociationCommand command) {
        return mapper.toView(repository.save(mapper.toEntity(command)));
    }

    @Override
    public List<CompetitionAssociationView> findLegacyByPool(Long poolId) {
        return repository.findByPoolIdAndActive(poolId, true).stream().map(mapper::toView).toList();
    }

    @Override
    public List<CompetitionAssociationView> findLegacyByTeam(Long teamId) {
        return repository.findByTeamIdAndActive(teamId, true).stream().map(mapper::toView).toList();
    }

    @Override
    public CompetitionAssociationPage findPageByPool(Long poolId, int page, int pageSize) {
        Page<CompetitionAssociationEntity> result = repository.findByPoolIdAndActiveTrue(
                poolId, PageRequest.of(page, pageSize, Sort.by("teamId").ascending()));
        return page(result, page, pageSize);
    }

    @Override
    public CompetitionAssociationPage findPageByTeam(Long teamId, int page, int pageSize) {
        Page<CompetitionAssociationEntity> result = repository.findByTeamIdAndActiveTrue(
                teamId, PageRequest.of(page, pageSize, Sort.by("poolId").ascending()));
        return page(result, page, pageSize);
    }

    @Override
    public Optional<CompetitionStatisticsUpdate> findForUpdate(Long poolId, Long teamId) {
        return repository.findByPoolIdAndTeamId(poolId, teamId).map(JpaStatisticsUpdate::new);
    }

    private CompetitionAssociationPage page(Page<CompetitionAssociationEntity> result, int page, int pageSize) {
        return new CompetitionAssociationPage(result.getContent().stream().map(mapper::toView).toList(), page,
                pageSize, result.getTotalElements(), result.hasNext());
    }

    private final class JpaAssociationActivation implements CompetitionAssociationActivation {
        private final CompetitionAssociationEntity entity;

        private JpaAssociationActivation(CompetitionAssociationEntity entity) {
            this.entity = entity;
        }

        @Override
        public CompetitionAssociationView current() {
            return mapper.toView(entity);
        }

        @Override
        public CompetitionAssociationView reactivate() {
            entity.setActive(true);
            return mapper.toView(repository.save(entity));
        }
    }

    private final class JpaStatisticsUpdate implements CompetitionStatisticsUpdate {
        private final CompetitionAssociationEntity entity;

        private JpaStatisticsUpdate(CompetitionAssociationEntity entity) {
            this.entity = entity;
        }

        @Override
        public CompetitionAssociationChange replace(CompetitionStatisticsSnapshot snapshot) {
            CompetitionAssociationView before = mapper.toView(entity);
            mapper.replaceStatistics(snapshot, entity);
            return new CompetitionAssociationChange(before, mapper.toView(repository.save(entity)));
        }
    }
}
