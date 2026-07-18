package com.blockout.teams.team.application;

import com.blockout.shared.model.FollowerCountDeltaEnum;

public record TeamFollowerCommand(Long teamId, Long userId, FollowerCountDeltaEnum delta) {
}
