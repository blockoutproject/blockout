package com.blockout.teams.team.application;

public interface TeamLogoStorage {

    String upload(TeamLogoUpload upload);

    void delete(String url);
}
