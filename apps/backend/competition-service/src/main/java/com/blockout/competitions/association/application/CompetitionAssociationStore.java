package com.blockout.competitions.association.application;

import java.util.List;
import java.util.Optional;

public interface CompetitionAssociationStore {

    Optional<CompetitionAssociationActivation> findForActivation(Long poolId, Long teamId);

    CompetitionAssociationView create(AddCompetitionAssociationCommand command);

    List<CompetitionAssociationView> findLegacyByPool(Long poolId);

    List<CompetitionAssociationView> findLegacyByTeam(Long teamId);

    CompetitionAssociationPage findPageByPool(Long poolId, int page, int pageSize);

    CompetitionAssociationPage findPageByTeam(Long teamId, int page, int pageSize);
}
