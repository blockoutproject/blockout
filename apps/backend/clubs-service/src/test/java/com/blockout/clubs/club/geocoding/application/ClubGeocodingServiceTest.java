package com.blockout.clubs.club.geocoding.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ClubGeocodingServiceTest {

    @Test
    void savesOnlyUnambiguousCoordinatesAndContinuesPastUnresolvedClubs() {
        Target resolved = new Target("resolved", new ClubGeocodingQuery("Paris", "75001", "1 rue"));
        Target unresolved = new Target("unresolved", new ClubGeocodingQuery("Lyon", "69001", null));
        Store store = new Store(List.of(resolved, unresolved));
        ClubGeocoder geocoder = query -> "Paris".equals(query.city())
                ? Optional.of(new ClubCoordinates(48.8, 2.3))
                : Optional.empty();

        new ClubGeocodingService(store, geocoder).geocodePendingClubs();

        assertThat(resolved.saved).isEqualTo(new ClubCoordinates(48.8, 2.3));
        assertThat(unresolved.saved).isNull();
        assertThat(store.countCalls).isEqualTo(1);
    }

    private static final class Store implements ClubGeocodingStore {
        private final List<ClubGeocodingTarget> targets;
        private int countCalls;

        private Store(List<ClubGeocodingTarget> targets) {
            this.targets = targets;
        }

        @Override
        public List<ClubGeocodingTarget> findPending() {
            return targets;
        }

        @Override
        public long countGeocoded() {
            countCalls++;
            return targets.stream().filter(target -> ((Target) target).saved != null).count();
        }
    }

    private static final class Target implements ClubGeocodingTarget {
        private final String id;
        private final ClubGeocodingQuery query;
        private ClubCoordinates saved;

        private Target(String id, ClubGeocodingQuery query) {
            this.id = id;
            this.query = query;
        }

        @Override
        public String id() {
            return id;
        }

        @Override
        public ClubGeocodingQuery query() {
            return query;
        }

        @Override
        public void save(ClubCoordinates coordinates) {
            saved = coordinates;
        }
    }
}
