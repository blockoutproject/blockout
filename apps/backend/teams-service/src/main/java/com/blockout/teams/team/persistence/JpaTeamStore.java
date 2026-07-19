package com.blockout.teams.team.persistence;

import com.blockout.shared.model.FollowerCountDeltaEnum;
import com.blockout.teams.team.application.CreateTeamCommand;
import com.blockout.teams.team.application.LegacyCreateTeamCommand;
import com.blockout.teams.team.application.TeamChange;
import com.blockout.teams.team.application.TeamClubIdPage;
import com.blockout.teams.team.application.TeamFilter;
import com.blockout.teams.team.application.TeamFollowerCommand;
import com.blockout.teams.team.application.TeamFollowerStore;
import com.blockout.teams.team.application.TeamLifecycleStore;
import com.blockout.teams.team.application.TeamPage;
import com.blockout.teams.team.application.TeamStore;
import com.blockout.teams.team.application.TeamUpdate;
import com.blockout.teams.team.application.TeamUpdatePlan;
import com.blockout.teams.team.application.TeamView;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaTeamStore implements TeamStore, TeamFollowerStore, TeamLifecycleStore {
    private final TeamRepository repository;
    private final TeamPersistenceMapper mapper;

    @Override
    public TeamView create(CreateTeamCommand command) {
        TeamEntity entity = mapper.toEntity(command);
        entity.setFollowersCount(0L);
        entity.setActive(true);
        return mapper.toView(repository.saveAndFlush(entity));
    }

    @Override
    public TeamView createLegacy(LegacyCreateTeamCommand command) {
        return mapper.toView(repository.saveAndFlush(mapper.toEntity(command)));
    }

    @Override
    public Optional<TeamView> findById(Long id) {
        return repository.findById(id).map(mapper::toView);
    }

    @Override
    public List<TeamView> findLegacy(TeamFilter filter) {
        return repository.findFilteredLegacy(
                        filter.divisionId(), filter.format(), filter.gender(), filter.season(), filter.clubId(),
                        filter.ids(), filter.ids().size(), filter.active())
                .stream().map(mapper::toView).toList();
    }

    @Override
    public TeamPage findPage(TeamFilter filter, int page, int pageSize) {
        PageRequest request = PageRequest.of(page, pageSize,
                Sort.by("rawName").ascending().and(Sort.by("id").ascending()));
        Page<TeamEntity> result = repository.findFiltered(
                filter.divisionId(), filter.format(), filter.gender(), filter.season(), filter.clubId(), filter.ids(),
                filter.ids().size(), filter.active(), request);
        return new TeamPage(result.getContent().stream().map(mapper::toView).toList(),
                page, pageSize, result.getTotalElements(), result.hasNext());
    }

    @Override
    public List<String> findClubIdsLegacy() {
        return repository.findDistinctClubIdsLegacy();
    }

    @Override
    public TeamClubIdPage findClubIdsPage(int page, int pageSize) {
        Page<String> result = repository.findDistinctClubIds(PageRequest.of(page, pageSize));
        return new TeamClubIdPage(result.getContent(), page, pageSize, result.getTotalElements(), result.hasNext());
    }

    @Override
    public Optional<TeamUpdate> findForUpdate(Long id) {
        return repository.findById(id).map(JpaTeamUpdate::new);
    }

    @Override
    public Optional<TeamView> updateFollowers(TeamFollowerCommand command) {
        return repository.findById(command.teamId()).map(entity -> {
            long current = entity.getFollowersCount();
            entity.setFollowersCount(command.delta() == FollowerCountDeltaEnum.INCREMENT
                    ? current + 1 : Math.max(0, current - 1));
            return mapper.toView(repository.save(entity));
        });
    }

    @Override
    public Optional<TeamChange> deactivate(Long id) {
        return repository.findById(id).map(entity -> {
            TeamView before = mapper.toView(entity);
            if (Boolean.FALSE.equals(entity.getActive())) {
                return new TeamChange(before, before);
            }
            entity.setActive(false);
            return new TeamChange(before, mapper.toView(repository.saveAndFlush(entity)));
        });
    }

    @Override
    public List<TeamChange> deactivateByClubId(String clubId) {
        return repository.findByClubIdAndActiveTrue(clubId).stream().map(entity -> {
            TeamView before = mapper.toView(entity);
            entity.setActive(false);
            return new TeamChange(before, mapper.toView(repository.saveAndFlush(entity)));
        }).toList();
    }

    private final class JpaTeamUpdate implements TeamUpdate {
        private final TeamEntity entity;

        private JpaTeamUpdate(TeamEntity entity) {
            this.entity = entity;
        }

        @Override
        public TeamView current() {
            return mapper.toView(entity);
        }

        @Override
        public TeamChange apply(TeamUpdatePlan plan) {
            TeamView before = current();
            mapper.apply(plan.command(), entity);
            if (plan.replaceLogo()) {
                entity.setLogoUrl(plan.replacementLogoUrl());
            }
            return new TeamChange(before, mapper.toView(repository.saveAndFlush(entity)));
        }
    }
}
