package com.blockout.config.division.application;

import com.blockout.config.division.domain.DivisionLogoUpload;

public interface DivisionLogoStorage {

    String upload(DivisionLogoUpload image);

    void delete(String url);
}
