package com.blockout.config.division.application;

import java.util.List;
import java.util.Optional;

public interface DivisionStore {

    List<DivisionView> findAll();

    Optional<DivisionView> findById(Long id);

    boolean existsByNameIgnoreCase(String name);

    DivisionView create(CreateDivisionCommand command, String logoUrl);

    Optional<DivisionUpdate> findForUpdate(Long id);

    boolean deactivate(Long id);
}
