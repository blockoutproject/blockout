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
        try {
            List<Club> clubs = clubRepository.findAll().stream()
                    .filter(c -> Boolean.TRUE.equals(c.getActive())
                            && (c.getLatitude() == null || c.getLongitude() == null)
                            && c.getCity() != null
                            && c.getPostalCode() != null)
                    .toList();

            if (clubs.isEmpty()) {
                logger.debug("No clubs to geocode",
                        keyValue("action", "club_geocoding"));
                return;
            }

            logger.info("Starting club geocoding job",
                    keyValue("action", "club_geocoding_start"),
                    keyValue("count", clubs.size()));

            for (Club club : clubs) {
                try {
                    var result = mapboxClient.geocode(club.getCity(), club.getPostalCode());

                    if (result == null) {
                        logger.warn("Geocoding failed",
                                keyValue("clubId", club.getId()));
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

            logger.info("Club geocoding job completed",
                    keyValue("action", "club_geocoding_done"),
                    keyValue("count", clubs.size()));

        } catch (Exception e) {
            logger.error("Fatal error in club geocoding job",
                    keyValue("action", "club_geocoding"),
                    keyValue("error", e.getMessage()), e);
        }
    }
}