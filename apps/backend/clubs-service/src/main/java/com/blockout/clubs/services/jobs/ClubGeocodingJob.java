package com.blockout.clubs.services.jobs;

import com.blockout.clubs.models.entities.Club;
import com.blockout.clubs.repositories.ClubRepository;
import com.blockout.clubs.services.clients.MapboxClient;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ClubGeocodingJob {

    private static final Logger logger = LoggerFactory.getLogger(ClubGeocodingJob.class);

    private final ClubRepository clubRepository;
    private final MapboxClient mapboxClient;

    @Scheduled(initialDelay = 0, fixedDelay = 7 * 24 * 60 * 60 * 1000L)
    @Transactional
    public void geocodeClubs() {
        int ambiguousTotal = 0;
        int processed = 0;

        try {
            List<Club> clubs = clubRepository.findAll().stream()
                    .filter(c -> Boolean.TRUE.equals(c.getActive())
                            && (c.getLatitude() == null || c.getLongitude() == null)
                            && c.getCity() != null
                            && c.getPostalCode() != null)
                    .toList();

            if (clubs.isEmpty()) {
                long geocodedTotalInDb = clubRepository.findAll().stream()
                        .filter(c -> c.getLatitude() != null && c.getLongitude() != null)
                        .count();

                logger.info("Club geocoding summary",
                        keyValue("action", "club_geocoding_done"),
                        keyValue("geocoded_total_in_db", geocodedTotalInDb),
                        keyValue("ambiguous_total", 0),
                        keyValue("processed", 0));
                return;
            }

            logger.info("Starting club geocoding job",
                    keyValue("action", "club_geocoding_start"),
                    keyValue("count", clubs.size()));

            for (Club club : clubs) {
                try {
                    processed++;

                    var result = mapboxClient.geocode(
                            club.getCity(),
                            club.getPostalCode(),
                            club.getAddress()
                    );

                    if (result == null) {
                        ambiguousTotal++;
                        logger.warn("Geocoding failed (ambiguous or not found)",
                                keyValue("clubId", club.getId()),
                                keyValue("city", club.getCity()),
                                keyValue("postalCode", club.getPostalCode()));
                        continue;
                    }

                    club.setLatitude(result.latitude());
                    club.setLongitude(result.longitude());
                    clubRepository.save(club);

                    logger.info("Club geocoded",
                            keyValue("clubId", club.getId()),
                            keyValue("lat", result.latitude()),
                            keyValue("lon", result.longitude()));

                } catch (Exception e) {
                    logger.error("Error while geocoding club",
                            keyValue("clubId", club.getId()),
                            keyValue("error", e.getMessage()), e);
                }
            }

            long geocodedTotalInDb = clubRepository.findAll().stream()
                    .filter(c -> c.getLatitude() != null && c.getLongitude() != null)
                    .count();

            logger.info("Club geocoding summary",
                    keyValue("action", "club_geocoding_done"),
                    keyValue("geocoded_total_in_db", geocodedTotalInDb),
                    keyValue("ambiguous_total", ambiguousTotal),
                    keyValue("processed", processed));

        } catch (Exception e) {
            long geocodedTotalInDb = clubRepository.findAll().stream()
                    .filter(c -> c.getLatitude() != null && c.getLongitude() != null)
                    .count();

            logger.error("Fatal error in club geocoding job",
                    keyValue("action", "club_geocoding"),
                    keyValue("error", e.getMessage()),
                    keyValue("geocoded_total_in_db", geocodedTotalInDb),
                    keyValue("ambiguous_total", ambiguousTotal),
                    keyValue("processed", processed),
                    e);
        }
    }
}