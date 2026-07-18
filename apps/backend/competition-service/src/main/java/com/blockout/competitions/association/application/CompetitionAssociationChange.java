package com.blockout.competitions.association.application;

public record CompetitionAssociationChange(
        CompetitionAssociationView before,
        CompetitionAssociationView after) {
}
