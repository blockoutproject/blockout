package com.blockout.teams.team.application;

import java.util.List;

public interface TeamLifecycleStore {
    boolean deactivate(Long id);
    List<Long> deactivateByClubId(String clubId);
}
