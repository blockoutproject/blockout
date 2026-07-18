package com.blockout.matches.match.application;

import com.blockout.shared.model.MatchStatusEnum;
import java.util.List;
import java.util.Optional;

public interface MatchStore {

    MatchSnapshot create(CreateMatchCommand command, MatchStatusEnum status, boolean active);

    List<MatchSnapshot> findAll(MatchQuery query);

    MatchPage findPage(MatchQuery query, int page, int pageSize);

    Optional<MatchSnapshot> findById(Long id);

    Optional<MatchUpdate> findForUpdate(Long id);

    int deactivate(DeactivateMatchesCommand command);
}
