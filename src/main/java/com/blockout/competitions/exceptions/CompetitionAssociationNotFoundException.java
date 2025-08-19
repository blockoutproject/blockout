package com.blockout.competitions.exceptions;

public class CompetitionAssociationNotFoundException extends RuntimeException {
    public CompetitionAssociationNotFoundException(Long teamId, Long poolId) {
        super("Association not found with teamId: " + teamId + " and poolId: " + poolId);
    }
}
