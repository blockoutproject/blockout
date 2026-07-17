package com.blockout.competitions.association.application;

import java.util.List;

public record CompetitionAssociationPage(
        List<CompetitionAssociationView> items,
        int page,
        int pageSize,
        long totalItems,
        boolean hasNext) {

    public CompetitionAssociationPage {
        items = List.copyOf(items);
    }
}
