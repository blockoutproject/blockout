package com.blockout.competitions.association.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompetitionAssociationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CompetitionAssociationService.class);

    private final CompetitionAssociationStore store;

    @Transactional
    public CompetitionAssociationView addOrReactivate(AddCompetitionAssociationCommand command) {
        return store.findForActivation(command.poolId(), command.teamId())
                .map(activation -> reactivate(activation, command))
                .orElseGet(() -> create(command));
    }

    @Transactional(readOnly = true)
    public List<CompetitionAssociationView> findLegacyByPool(Long poolId) {
        return store.findLegacyByPool(poolId);
    }

    @Transactional(readOnly = true)
    public List<CompetitionAssociationView> findLegacyByTeam(Long teamId) {
        return store.findLegacyByTeam(teamId);
    }

    @Transactional(readOnly = true)
    public CompetitionAssociationPage findPageByPool(Long poolId, int page, int pageSize) {
        return store.findPageByPool(poolId, page, pageSize);
    }

    @Transactional(readOnly = true)
    public CompetitionAssociationPage findPageByTeam(Long teamId, int page, int pageSize) {
        return store.findPageByTeam(teamId, page, pageSize);
    }

    private CompetitionAssociationView reactivate(
            CompetitionAssociationActivation activation, AddCompetitionAssociationCommand command) {
        CompetitionAssociationView current = activation.current();
        if (!Boolean.TRUE.equals(current.active())) {
            LOGGER.info("Association reactivated", keyValue("action", "reactivate_association"),
                    keyValue("poolId", command.poolId()), keyValue("teamId", command.teamId()),
                    keyValue("clubId", command.clubId()));
            return activation.reactivate();
        }
        return current;
    }

    private CompetitionAssociationView create(AddCompetitionAssociationCommand command) {
        CompetitionAssociationView saved = store.create(command);
        LOGGER.info("New association created", keyValue("action", "create_association"),
                keyValue("poolId", command.poolId()), keyValue("teamId", command.teamId()),
                keyValue("clubId", command.clubId()));
        return saved;
    }
}
