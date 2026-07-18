package com.blockout.matches.match.application;

import com.blockout.shared.model.MatchStatusEnum;

public record MatchUpdatePlan(UpdateMatchCommand command, MatchStatusEnum status, boolean active) {
}
