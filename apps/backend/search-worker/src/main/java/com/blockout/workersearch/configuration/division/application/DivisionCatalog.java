package com.blockout.workersearch.configuration.division.application;

import java.util.List;

public interface DivisionCatalog {

    List<DivisionSnapshot> findAll();

    DivisionSnapshot getById(Long id);
}
