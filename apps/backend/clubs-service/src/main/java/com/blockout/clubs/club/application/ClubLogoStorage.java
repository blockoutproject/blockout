package com.blockout.clubs.club.application;

public interface ClubLogoStorage {

    String upload(ClubLogoUpload upload);

    void delete(String url);
}
