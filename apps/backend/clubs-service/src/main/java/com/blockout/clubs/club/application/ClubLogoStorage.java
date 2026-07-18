package com.blockout.clubs.club.application;

import com.blockout.clubs.club.domain.ClubLogoUpload;

public interface ClubLogoStorage {

    String upload(ClubLogoUpload upload);

    void delete(String url);
}
