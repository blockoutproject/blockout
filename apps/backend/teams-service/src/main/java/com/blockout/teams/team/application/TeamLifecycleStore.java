package com.blockout.teams.team.application;

import java.util.List;
import java.util.Optional;

public interface TeamLifecycleStore {
    Optional<TeamChange> deactivate(Long id);
    List<TeamChange> deactivateByClubId(String clubId);
}
