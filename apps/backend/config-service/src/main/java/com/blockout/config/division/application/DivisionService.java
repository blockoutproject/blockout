package com.blockout.config.division.application;

import com.blockout.config.division.application.commands.CreateDivisionCommand;
import com.blockout.config.division.application.commands.UpdateDivisionCommand;
import com.blockout.config.division.application.views.DivisionView;

import java.util.List;

/**
 * Defines Division use cases independently of transport and persistence.
 */
public interface DivisionService {

    /**
     * Lists every persisted division.
     */
    List<DivisionView> findAll();

    /**
     * Returns one division by identifier.
     */
    DivisionView getById(Long id);

    /**
     * Creates one division.
     */
    DivisionView create(CreateDivisionCommand command);

    /**
     * Applies a partial update and reactivates the division.
     */
    DivisionView update(Long id, UpdateDivisionCommand command);

    /**
     * Soft-deletes one division.
     */
    void deactivate(Long id);
}
