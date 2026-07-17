package com.blockout.competitions.lifecycle.application;

public interface CompetitionLifecycleEvents {

    void publishTeamDeactivation(Long teamId);

    void publishPoolDeactivation(Long poolId);

    void publishTeamDeactivationByPool(Long teamId, Long poolId);

    void publishClubDeactivation(String clubId);
}
