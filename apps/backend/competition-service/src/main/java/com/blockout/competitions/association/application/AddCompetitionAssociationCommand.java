package com.blockout.competitions.association.application;

public record AddCompetitionAssociationCommand(Long poolId, Long teamId, String clubId) {
}
