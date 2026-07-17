package com.blockout.config.division.application;

public interface DivisionLogoStorage {

    String upload(DivisionLogoUpload image);

    void delete(String url);
}
