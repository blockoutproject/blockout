package com.blockout.teams.team.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeamLifecycleService {
    private static final Logger LOGGER = LoggerFactory.getLogger(TeamLifecycleService.class);
    private final TeamLifecycleStore store;
    private final TeamEventPublisher eventPublisher;

    @Transactional
    public void deactivate(Long id) {
        TeamChange change = store.deactivate(id).orElseThrow(() -> notFound(id));
        if (change.changed()) {
            eventPublisher.publishProjection(TeamEventData.from(change.after()));
        }
        LOGGER.info("Team successfully deactivated", keyValue("action", "deactivate_team"), keyValue("teamId", id));
    }

    @Transactional
    public void deactivateByClubId(String clubId) {
        List<TeamChange> changes = store.deactivateByClubId(clubId);
        if (changes.isEmpty()) {
            LOGGER.warn("No active teams found for club", keyValue("action", "deactivate_teams_by_club"),
                    keyValue("clubId", clubId));
            return;
        }
        changes.forEach(change -> {
            eventPublisher.publishProjection(TeamEventData.from(change.after()));
            LOGGER.info("Team deactivated as part of club deactivation",
                    keyValue("action", "deactivate_teams_by_club"), keyValue("teamId", change.after().id()),
                    keyValue("clubId", clubId));
        });
    }

    private TeamNotFoundException notFound(Long id) {
        LOGGER.warn("Team not found", keyValue("action", "get_team_by_id"), keyValue("teamId", id));
        return new TeamNotFoundException(id);
    }
}
