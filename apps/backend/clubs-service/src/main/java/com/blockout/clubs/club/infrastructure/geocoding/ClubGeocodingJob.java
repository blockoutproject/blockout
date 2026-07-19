package com.blockout.clubs.club.infrastructure.geocoding;

import com.blockout.clubs.club.infrastructure.persistence.entities.ClubEntity;
import com.blockout.clubs.club.infrastructure.persistence.repositories.ClubRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Component
@RequiredArgsConstructor
public class ClubGeocodingJob {

    private static final Logger LOGGER = LoggerFactory.getLogger(ClubGeocodingJob.class);

    private final ClubRepository clubRepository;
    private final MapboxClient mapboxClient;

    @Scheduled(
            initialDelayString = "${clubs.geocoding.initial-delay:0}",
            fixedDelayString = "${clubs.geocoding.fixed-delay:604800000}")
    @Transactional
    public void geocodeClubs() {
        List<ClubEntity> clubs = clubRepository.findAll().stream()
                .filter(club -> club.isActive()
                        && (club.getLatitude() == null || club.getLongitude() == null)
                        && club.getCity() != null
                        && club.getPostalCode() != null)
                .toList();
        int processed = 0;
        int ambiguous = 0;

        for (ClubEntity club : clubs) {
            processed++;
            try {
                MapboxClient.GeocodingResult result = mapboxClient.geocode(
                        club.getCity(),
                        club.getPostalCode(),
                        club.getAddress());
                if (result == null) {
                    ambiguous++;
                    continue;
                }
                club.setLatitude(result.latitude());
                club.setLongitude(result.longitude());
                clubRepository.save(club);
            } catch (Exception exception) {
                LOGGER.error("Failed to geocode club",
                        keyValue("action", "club_geocoding"),
                        keyValue("clubId", club.getId()),
                        exception);
            }
        }

        LOGGER.info("Completed club geocoding",
                keyValue("action", "club_geocoding_done"),
                keyValue("processed", processed),
                keyValue("ambiguous", ambiguous));
    }
}
