package com.blockout.teams.team.application;

import com.blockout.shared.model.ImageChangeModeEnum;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.teams.shared.application.ChangeLog;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeamService {

    private static final Logger LOGGER = LoggerFactory.getLogger(TeamService.class);

    private final TeamStore store;
    private final TeamLogoStorage logoStorage;
    private final TeamEventPublisher eventPublisher;

    @Transactional
    public TeamView create(CreateTeamCommand command) {
        return publishCreated(store.create(command));
    }

    @Transactional
    public TeamView createLegacy(LegacyCreateTeamCommand command) {
        return publishCreated(store.createLegacy(command));
    }

    @Transactional(readOnly = true)
    public TeamView getById(Long id) {
        return find(id);
    }

    @Transactional(readOnly = true)
    public List<TeamView> findLegacy(TeamFilter filter) {
        List<TeamView> teams = store.findLegacy(filter);
        logList(filter, teams.size());
        return teams;
    }

    @Transactional(readOnly = true)
    public TeamPage findPage(TeamFilter filter, int page, int pageSize) {
        TeamPage result = store.findPage(filter, page, pageSize);
        logList(filter, result.items().size());
        return result;
    }

    @Transactional(readOnly = true)
    public List<String> findClubIdsLegacy() {
        return store.findClubIdsLegacy();
    }

    @Transactional(readOnly = true)
    public TeamClubIdPage findClubIdsPage(int page, int pageSize) {
        return store.findClubIdsPage(page, pageSize);
    }

    @Transactional
    public TeamView update(Long id, UpdateTeamCommand command, TeamLogoChange logoChange) {
        TeamUpdate update = store.findForUpdate(id).orElseThrow(() -> notFound(id));
        TeamView before = update.current();
        String replacementLogoUrl = null;
        boolean replaceLogo = logoChange.mode() != ImageChangeModeEnum.KEEP;
        if (replaceLogo && before.logoUrl() != null) {
            logoStorage.delete(before.logoUrl());
        }
        if (logoChange.mode() == ImageChangeModeEnum.REPLACE) {
            replacementLogoUrl = logoStorage.upload(logoChange.upload());
        }

        TeamChange change = update.apply(new TeamUpdatePlan(command, replacementLogoUrl, replaceLogo));
        if (Boolean.FALSE.equals(change.before().active()) && Boolean.TRUE.equals(change.after().active())) {
            LOGGER.info("Team reactivated", keyValue("action", "reactivate_team"), keyValue("teamId", id));
        }
        ChangeLog.logChanges(change.before(), change.after(), LOGGER, "update_team", change.after().id());
        TeamEventData event = TeamEventData.from(change.after());
        eventPublisher.publishUpsert(event);
        eventPublisher.publishProjection(event);
        return change.after();
    }

    private TeamView publishCreated(TeamView view) {
        LOGGER.info("Team created successfully", keyValue("action", "create_team"), keyValue("teamId", view.id()));
        TeamEventData event = TeamEventData.from(view);
        eventPublisher.publishUpsert(event);
        eventPublisher.publishProjection(event);
        return view;
    }

    private TeamView find(Long id) {
        return store.findById(id).orElseThrow(() -> notFound(id));
    }

    private TeamNotFoundException notFound(Long id) {
        LOGGER.warn("Team not found", keyValue("action", "get_team_by_id"), keyValue("teamId", id));
        return new TeamNotFoundException(id);
    }

    private void logList(TeamFilter filter, int count) {
        LOGGER.debug("Listing teams", keyValue("action", "list_teams"),
                keyValue("divisionId", filter.divisionId()), keyValue("format", filter.format()),
                keyValue("gender", filter.gender()), keyValue("season", filter.season()),
                keyValue("clubId", filter.clubId()), keyValue("ids", filter.ids()),
                keyValue("active", filter.active()), keyValue("resultCount", count));
    }
}
