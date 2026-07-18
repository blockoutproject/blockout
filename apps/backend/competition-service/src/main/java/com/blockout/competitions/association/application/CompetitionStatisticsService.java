package com.blockout.competitions.association.application;

import com.blockout.competitions.shared.application.ChangeLog;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompetitionStatisticsService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CompetitionStatisticsService.class);

    private final CompetitionStatisticsStore store;

    @Transactional
    public CompetitionAssociationView replace(
            Long poolId, Long teamId, CompetitionStatisticsSnapshot snapshot) {
        CompetitionStatisticsUpdate update = store.findForUpdate(poolId, teamId)
                .orElseThrow(() -> new CompetitionAssociationNotFoundException(teamId, poolId));
        CompetitionAssociationChange change = update.replace(snapshot);
        ChangeLog.logChanges(
                change.before(), change.after(), LOGGER, "update_association_stats", change.after().id());
        return change.after();
    }
}
