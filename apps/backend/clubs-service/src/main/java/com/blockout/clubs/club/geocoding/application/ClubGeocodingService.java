package com.blockout.clubs.club.geocoding.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClubGeocodingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ClubGeocodingService.class);

    private final ClubGeocodingStore store;
    private final ClubGeocoder geocoder;

    @Transactional
    public void geocodePendingClubs() {
        int unresolved = 0;
        int processed = 0;

        try {
            List<ClubGeocodingTarget> clubs = store.findPending();
            if (clubs.isEmpty()) {
                logSummary(store.countGeocoded(), 0, 0);
                return;
            }

            LOGGER.info("Starting club geocoding job",
                    keyValue("action", "club_geocoding_start"), keyValue("count", clubs.size()));

            for (ClubGeocodingTarget club : clubs) {
                try {
                    processed++;
                    var result = geocoder.geocode(club.query());
                    if (result.isEmpty()) {
                        unresolved++;
                        LOGGER.warn("Geocoding failed (ambiguous or not found)",
                                keyValue("clubId", club.id()),
                                keyValue("city", club.query().city()),
                                keyValue("postalCode", club.query().postalCode()));
                        continue;
                    }

                    ClubCoordinates coordinates = result.orElseThrow();
                    club.save(coordinates);
                    LOGGER.info("Club geocoded", keyValue("clubId", club.id()),
                            keyValue("lat", coordinates.latitude()), keyValue("lon", coordinates.longitude()));
                } catch (Exception exception) {
                    LOGGER.error("Error while geocoding club", keyValue("clubId", club.id()),
                            keyValue("error", exception.getMessage()), exception);
                }
            }

            logSummary(store.countGeocoded(), unresolved, processed);
        } catch (Exception exception) {
            LOGGER.error("Fatal error in club geocoding job",
                    keyValue("action", "club_geocoding"),
                    keyValue("error", exception.getMessage()),
                    keyValue("geocoded_total_in_db", store.countGeocoded()),
                    keyValue("ambiguous_total", unresolved),
                    keyValue("processed", processed),
                    exception);
        }
    }

    private void logSummary(long geocodedTotal, int unresolved, int processed) {
        LOGGER.info("Club geocoding summary",
                keyValue("action", "club_geocoding_done"),
                keyValue("geocoded_total_in_db", geocodedTotal),
                keyValue("ambiguous_total", unresolved),
                keyValue("processed", processed));
    }
}
