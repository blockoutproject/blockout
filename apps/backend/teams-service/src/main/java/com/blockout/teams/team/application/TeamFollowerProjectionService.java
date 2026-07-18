package com.blockout.teams.team.application;

import com.blockout.shared.model.FollowerCountDeltaEnum;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeamFollowerProjectionService {
    private static final Logger LOGGER = LoggerFactory.getLogger(TeamFollowerProjectionService.class);
    private final TeamFollowerStore store;

    @Transactional
    public TeamView updateFollowers(TeamFollowerCommand command) {
        TeamView team = store.updateFollowers(command).orElseThrow(() -> notFound(command.teamId()));
        String action = command.delta() == FollowerCountDeltaEnum.INCREMENT
                ? "increment_followers_count" : "decrement_followers_count";
        LOGGER.info("Team followers projection updated", keyValue("action", action),
                keyValue("teamId", command.teamId()), keyValue("userId", command.userId()),
                keyValue("newFollowersCount", team.followersCount()));
        return team;
    }

    private TeamNotFoundException notFound(Long id) {
        LOGGER.warn("Team not found", keyValue("action", "get_team_by_id"), keyValue("teamId", id));
        return new TeamNotFoundException(id);
    }
}
