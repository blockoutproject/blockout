package com.blockout.competitions.association.application.ports;

/** Publishes the existing cascade-deactivation commands owned by competition-service. */
public interface CompetitionDeactivationPublisher {

    void publishTeamDeactivation(Long teamId);

    void publishPoolDeactivation(Long poolId);

    void publishTeamDeactivationByPool(Long teamId, Long poolId);

    void publishClubDeactivation(String clubId);
}
