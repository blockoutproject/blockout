package com.blockout.mobilegateway.search.application;

import java.util.List;

public interface MobileSearchGateway {

    List<MobileSearchWorkflow.ClubResult> clubs(String query);

    List<MobileSearchWorkflow.TeamResult> teams(MobileSearchWorkflow.Filters filters);

    List<MobileSearchWorkflow.PoolResult> pools(MobileSearchWorkflow.Filters filters);
}
