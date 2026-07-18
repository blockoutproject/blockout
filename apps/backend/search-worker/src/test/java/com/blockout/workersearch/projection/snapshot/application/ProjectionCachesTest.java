package com.blockout.workersearch.projection.snapshot.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.workersearch.models.enums.Format;
import com.blockout.workersearch.models.enums.Gender;
import java.util.List;
import org.junit.jupiter.api.Test;

class ProjectionCachesTest {

    @Test
    void clubReplacementPublishesACompleteImmutableSnapshot() {
        ClubProjectionCache cache = new ClubProjectionCache();
        cache.put(new ClubCacheSnapshot("old", "Old", null, "Paris"));

        cache.replaceAll(List.of(
                new ClubCacheSnapshot("one", "One", null, "Lyon"),
                new ClubCacheSnapshot("two", "Two", null, "Nice")));

        assertThat(cache.getById("old")).isNull();
        assertThat(cache.getAll()).extracting(ClubCacheSnapshot::id).containsExactly("one", "two");
        assertThat(cache.getAll()).isUnmodifiable();
    }

    @Test
    void teamUpsertReplacesTheSameIdentityAndMovesItBetweenClubs() {
        TeamProjectionCache cache = new TeamProjectionCache();
        cache.put(team(1L, "club-one", "First"));

        cache.put(team(1L, "club-two", "Updated"));

        assertThat(cache.size()).isOne();
        assertThat(cache.getByClubId("club-one")).isEmpty();
        assertThat(cache.getByClubId("club-two"))
                .extracting(TeamCacheSnapshot::name)
                .containsExactly("Updated");
    }

    @Test
    void removingAClubPublishesAFilteredSnapshot() {
        TeamProjectionCache cache = new TeamProjectionCache();
        cache.replaceAll(List.of(
                team(1L, "club-one", "One"),
                team(2L, "club-one", "Two"),
                team(3L, "club-two", "Three")));

        cache.removeClub("club-one");

        assertThat(cache.size()).isOne();
        assertThat(cache.getByClubId("club-two"))
                .extracting(TeamCacheSnapshot::id)
                .containsExactly(3L);
    }

    private TeamCacheSnapshot team(Long id, String clubId, String name) {
        return new TeamCacheSnapshot(
                id, name, name, clubId, 10L, Format.SIX, Gender.M, "2026", null);
    }
}
