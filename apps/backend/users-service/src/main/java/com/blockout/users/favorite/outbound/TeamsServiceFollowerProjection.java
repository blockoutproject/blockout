package com.blockout.users.favorite.outbound;

import com.blockout.users.favorite.application.TeamFollowerProjection;
import com.blockout.users.teamsclient.api.TeamFollowersClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TeamsServiceFollowerProjection implements TeamFollowerProjection {

    private final TeamFollowersClient client;

    @Override
    public void increment(Long teamId, Long userId) {
        client.incrementTeamFollowers(teamId, userId);
    }

    @Override
    public void decrement(Long teamId, Long userId) {
        client.decrementTeamFollowers(teamId, userId);
    }
}
