package com.blockout.teams.team.application;

import com.blockout.teams.team.domain.TeamLogoUpload;

public interface TeamLogoStorage {

    String upload(TeamLogoUpload upload);

    void delete(String url);
}
