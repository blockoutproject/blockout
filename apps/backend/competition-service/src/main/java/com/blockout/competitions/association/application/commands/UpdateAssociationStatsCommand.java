package com.blockout.competitions.association.application.commands;

public record UpdateAssociationStatsCommand(
        Integer played,
        Integer wins,
        Integer losses,
        Integer points,
        Integer winsThreeToZero,
        Integer winsThreeToOne,
        Integer winsThreeToTwo,
        Integer lossesZeroToThree,
        Integer lossesOneToThree,
        Integer lossesTwoToThree,
        Integer wonSets,
        Integer lostSets,
        Integer wonPoints,
        Integer lostPoints,
        Integer pointsPenalty,
        Double coefSets,
        Double coefPoints) {
}
