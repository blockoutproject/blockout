package com.blockout.clubs.club.geocoding.scheduling;

import com.blockout.clubs.club.geocoding.application.ClubGeocodingService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ClubGeocodingJob {

    private final ClubGeocodingService service;

    @Scheduled(initialDelay = 0, fixedDelay = 7 * 24 * 60 * 60 * 1000L)
    public void geocodeClubs() {
        service.geocodePendingClubs();
    }
}
