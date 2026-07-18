package com.blockout.competitions.association.application;

import java.util.Optional;

public interface CompetitionStatisticsStore {

    Optional<CompetitionStatisticsUpdate> findForUpdate(Long poolId, Long teamId);
}
