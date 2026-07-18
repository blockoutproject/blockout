package com.blockout.teams.team.api.v2;

import com.blockout.shared.model.FollowerCountDeltaEnum;
import com.blockout.teams.generated.api.TeamFollowersApi;
import com.blockout.teams.team.application.TeamFollowerCommand;
import com.blockout.teams.team.application.TeamFollowerProjectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class TeamFollowersV2Controller implements TeamFollowersApi {

    private final TeamFollowerProjectionService followerProjectionService;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_follow:teams')")
    public ResponseEntity<Void> incrementTeamFollowers(Long teamId, Long userId) {
        followerProjectionService.updateFollowers(
                new TeamFollowerCommand(teamId, userId, FollowerCountDeltaEnum.INCREMENT));
        return ResponseEntity.noContent().build();
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_follow:teams')")
    public ResponseEntity<Void> decrementTeamFollowers(Long teamId, Long userId) {
        followerProjectionService.updateFollowers(
                new TeamFollowerCommand(teamId, userId, FollowerCountDeltaEnum.DECREMENT));
        return ResponseEntity.noContent().build();
    }
}
