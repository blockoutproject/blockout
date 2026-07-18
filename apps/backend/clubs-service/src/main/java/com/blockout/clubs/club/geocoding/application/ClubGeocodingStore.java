package com.blockout.clubs.club.geocoding.application;

import java.util.List;

public interface ClubGeocodingStore {

    List<ClubGeocodingTarget> findPending();

    long countGeocoded();
}
