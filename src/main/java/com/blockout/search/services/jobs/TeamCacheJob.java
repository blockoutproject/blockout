package com.blockout.search.services.jobs;

import com.blockout.search.models.events.TeamUpsertEvent;
import com.blockout.search.services.cache.TeamCacheService;
import com.blockout.search.services.client.TeamClientService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamCacheJob {

    private static final Logger logger = LoggerFactory.getLogger(TeamCacheJob.class);
    private final TeamClientService teamClientService;
    private final TeamCacheService teamCacheService;

    @PostConstruct
    public void init() {
        logger.info("Initial team cache loading from API", keyValue("action", "init_team_cache"));
        refreshTeamCache();
    }

    @Scheduled(fixedRateString = "${team.cache.refresh.rate:600000}")
    public void refreshTeamCache() {
        try {
            var teams = teamClientService.listAllTeams();

            var events = teams.stream()
                    .map(team -> TeamUpsertEvent.builder()
                            .teamId(team.getId())
                            .name(team.getName())
                            .clubId(team.getClubId())
                            .divisionName(team.getDivisionName())
                            .format(team.getFormat())
                            .gender(team.getGender())
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