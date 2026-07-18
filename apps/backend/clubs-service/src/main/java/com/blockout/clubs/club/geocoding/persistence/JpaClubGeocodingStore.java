package com.blockout.clubs.club.geocoding.persistence;

import com.blockout.clubs.club.geocoding.application.ClubCoordinates;
import com.blockout.clubs.club.geocoding.application.ClubGeocodingQuery;
import com.blockout.clubs.club.geocoding.application.ClubGeocodingStore;
import com.blockout.clubs.club.geocoding.application.ClubGeocodingTarget;
import com.blockout.clubs.club.persistence.ClubEntity;
import com.blockout.clubs.club.persistence.ClubRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaClubGeocodingStore implements ClubGeocodingStore {

    private final ClubRepository repository;

    @Override
    public List<ClubGeocodingTarget> findPending() {
        return repository.findAll().stream()
                .filter(club -> Boolean.TRUE.equals(club.getActive())
                        && (club.getLatitude() == null || club.getLongitude() == null)
                        && club.getCity() != null
                        && club.getPostalCode() != null)
                .map(JpaClubGeocodingTarget::new)
                .map(ClubGeocodingTarget.class::cast)
                .toList();
    }

    @Override
    public long countGeocoded() {
        return repository.findAll().stream()
                .filter(club -> club.getLatitude() != null && club.getLongitude() != null)
                .count();
    }

    private final class JpaClubGeocodingTarget implements ClubGeocodingTarget {

        private final ClubEntity entity;

        private JpaClubGeocodingTarget(ClubEntity entity) {
            this.entity = entity;
        }

        @Override
        public String id() {
            return entity.getId();
        }

        @Override
        public ClubGeocodingQuery query() {
            return new ClubGeocodingQuery(entity.getCity(), entity.getPostalCode(), entity.getAddress());
        }

        @Override
        public void save(ClubCoordinates coordinates) {
            entity.setLatitude(coordinates.latitude());
            entity.setLongitude(coordinates.longitude());
            repository.save(entity);
        }
    }
}
