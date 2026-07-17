package com.blockout.teams.team.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.teams.exceptions.TeamNotFoundException;
import com.blockout.teams.team.persistence.TeamEntity;
import com.blockout.teams.team.persistence.TeamPersistenceMapper;
import com.blockout.teams.team.persistence.TeamRepository;
import com.blockout.teams.utils.DiffUtils;
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
public class TeamService {

    private static final Logger LOGGER = LoggerFactory.getLogger(TeamService.class);

    private final TeamRepository repository;
    private final TeamPersistenceMapper mapper;
    private final TeamLogoStorage logoStorage;
    private final TeamEventPublisher eventPublisher;

    @Transactional
    public TeamView create(CreateTeamCommand command) {
        TeamEntity entity = mapper.toEntity(command);
        entity.setFollowersCount(0L);
        entity.setActive(true);
        return saveCreated(entity);
    }

    @Transactional
    public TeamView createLegacy(LegacyCreateTeamCommand command) {
        return saveCreated(mapper.toEntity(command));
    }

    @Transactional(readOnly = true)
    public TeamView getById(Long id) {
        return mapper.toView(findEntity(id));
    }

    @Transactional(readOnly = true)
    public List<TeamView> findLegacy(TeamFilter filter) {
        List<TeamView> teams = repository.findFilteredLegacy(
                        filter.divisionId(), filter.format(), filter.gender(), filter.season(), filter.clubId(),
                        filter.ids(), filter.ids().size(), filter.active())
                .stream()
                .map(mapper::toView)
                .toList();
        logList(filter, teams.size());
        return teams;
    }

    @Transactional(readOnly = true)
    public TeamPage findPage(TeamFilter filter, int page, int pageSize) {
        PageRequest request = PageRequest.of(page, pageSize,
                Sort.by("rawName").ascending().and(Sort.by("id").ascending()));
        Page<TeamEntity> result = repository.findFiltered(
                filter.divisionId(), filter.format(), filter.gender(), filter.season(), filter.clubId(), filter.ids(),
                filter.ids().size(), filter.active(), request);
        List<TeamView> items = result.getContent().stream().map(mapper::toView).toList();
        logList(filter, items.size());
        return new TeamPage(items, page, pageSize, result.getTotalElements(), result.hasNext());
    }

    @Transactional(readOnly = true)
    public List<String> findClubIdsLegacy() {
        return repository.findDistinctClubIdsLegacy();
    }

    @Transactional(readOnly = true)
    public TeamClubIdPage findClubIdsPage(int page, int pageSize) {
        Page<String> result = repository.findDistinctClubIds(PageRequest.of(page, pageSize));
        return new TeamClubIdPage(result.getContent(), page, pageSize, result.getTotalElements(), result.hasNext());
    }

    @Transactional
    public TeamView update(Long id, UpdateTeamCommand command, TeamLogoChange logoChange) {
        TeamEntity entity = findEntity(id);
        TeamEntity before = entity.toBuilder().build();
        mapper.apply(command, entity);
        applyLogoChange(entity, logoChange);

        if (Boolean.FALSE.equals(before.getActive()) && Boolean.TRUE.equals(entity.getActive())) {
            LOGGER.info("Team reactivated", keyValue("action", "reactivate_team"), keyValue("teamId", id));
        }

        TeamEntity saved = repository.save(entity);
        TeamView view = mapper.toView(saved);
        DiffUtils.logChanges(before, saved, LOGGER, "update_team", saved.getId());
        eventPublisher.publishUpsert(view);
        return view;
    }

    @Transactional
    public void deactivate(Long id) {
        TeamEntity entity = findEntity(id);
        entity.setActive(false);
        repository.save(entity);
        LOGGER.info("Team successfully deactivated", keyValue("action", "deactivate_team"), keyValue("teamId", id));
    }

    @Transactional
    public TeamView updateFollowers(TeamFollowerCommand command) {
        TeamEntity entity = findEntity(command.teamId());
        if (command.delta() == TeamFollowerCommand.Delta.INCREMENT) {
            entity.setFollowersCount(entity.getFollowersCount() + 1);
        } else {
            entity.setFollowersCount(Math.max(0, entity.getFollowersCount() - 1));
        }
        TeamEntity saved = repository.save(entity);
        String action = command.delta() == TeamFollowerCommand.Delta.INCREMENT
                ? "increment_followers_count"
                : "decrement_followers_count";
        LOGGER.info("Team followers projection updated", keyValue("action", action),
                keyValue("teamId", command.teamId()), keyValue("userId", command.userId()),
                keyValue("newFollowersCount", saved.getFollowersCount()));
        return mapper.toView(saved);
    }

    @Transactional
    public void deactivateByClubId(String clubId) {
        List<TeamEntity> teams = repository.findByClubIdAndActiveTrue(clubId);
        if (teams.isEmpty()) {
            LOGGER.warn("No active teams found for club", keyValue("action", "deactivate_teams_by_club"),
                    keyValue("clubId", clubId));
            return;
        }
        teams.forEach(team -> {
            team.setActive(false);
            repository.save(team);
            LOGGER.info("Team deactivated as part of club deactivation",
                    keyValue("action", "deactivate_teams_by_club"), keyValue("teamId", team.getId()),
                    keyValue("clubId", clubId));
        });
    }

    private TeamView saveCreated(TeamEntity entity) {
        TeamEntity saved = repository.save(entity);
        TeamView view = mapper.toView(saved);
        LOGGER.info("Team created successfully", keyValue("action", "create_team"), keyValue("teamId", saved.getId()));
        eventPublisher.publishUpsert(view);
        return view;
    }

    private void applyLogoChange(TeamEntity entity, TeamLogoChange logoChange) {
        if (logoChange.mode() == TeamLogoChange.Mode.KEEP) {
            return;
        }
        if (entity.getLogoUrl() != null) {
            logoStorage.delete(entity.getLogoUrl());
        }
        if (logoChange.mode() == TeamLogoChange.Mode.REMOVE) {
            entity.setLogoUrl(null);
            return;
        }
        entity.setLogoUrl(logoStorage.upload(logoChange.upload()));
    }

    private TeamEntity findEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> {
            LOGGER.warn("Team not found", keyValue("action", "get_team_by_id"), keyValue("teamId", id));
            return new TeamNotFoundException(id);
        });
    }

    private void logList(TeamFilter filter, int count) {
        LOGGER.debug("Listing teams", keyValue("action", "list_teams"),
                keyValue("divisionId", filter.divisionId()), keyValue("format", filter.format()),
                keyValue("gender", filter.gender()), keyValue("season", filter.season()),
                keyValue("clubId", filter.clubId()), keyValue("ids", filter.ids()),
                keyValue("active", filter.active()), keyValue("resultCount", count));
    }
}
