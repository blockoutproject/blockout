package com.blockout.workersearch.services.jobs;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.services.caches.TeamCacheService;
import com.blockout.workersearch.services.clients.TeamClientService;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamCacheJob {

    private static final Logger logger = LoggerFactory.getLogger(TeamCacheJob.class);
    private final TeamClientService teamClientService;
    private final TeamCacheService teamCacheService;

    @Scheduled(fixedRate = 600000)
    public void refreshTeamCache() {
        try {
            var teams = teamClientService.listActiveTeams();
            var events = teams.stream()
                    .map(team -> TeamUpsertEvent.builder()
                            .id(team.getId())
                            .name(team.getName())
                            .shortName(team.getShortName())
                            .clubId(team.getClubId())
                            .divisionId(team.getDivisionId())
                            .format(team.getFormat())
                            .gender(team.getGender())
                            .season(team.getSeason())
                            .build())
                    .toList();

            teamCacheService.replaceAll(events);

            logger.info("Team cache refreshed",
                    keyValue("action", "refresh_team_cache_done"),
                    keyValue("teamCount", events.size()),
                    keyValue("clubCount", teamCacheService.getAllTeamCache().size()));

        } catch (Exception e) {
            logger.error("Error while refreshing team cache",
                    keyValue("action", "refresh_team_cache"),
                    keyValue("error", e.getMessage()), e);
        }
    }
}