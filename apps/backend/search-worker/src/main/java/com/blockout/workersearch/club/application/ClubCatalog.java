package com.blockout.workersearch.club.application;

import java.util.List;

public interface ClubCatalog {

    List<ClubSnapshot> findActiveClubs();

    ClubSnapshot getById(String id);
}
