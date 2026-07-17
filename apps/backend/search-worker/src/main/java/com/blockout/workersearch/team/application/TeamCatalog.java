package com.blockout.workersearch.team.application;

import java.util.List;

public interface TeamCatalog {

    List<TeamSnapshot> findActiveTeams();

    List<TeamSnapshot> findByClubId(String clubId);
}
