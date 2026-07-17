package com.blockout.mobilegateway.match.application;

import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Supplies transport-neutral match snapshots to the mobile match workflow. */
public interface MobileMatchGateway {

    /** Loads one canonical page of match-day groups. */
    DayPage listDays(MatchStatusEnum status, int page, int pageSize, List<Long> poolIds, List<Long> teamIds);

    /** Loads one match detail snapshot or {@code null} when it is absent. */
    MatchSnapshot find(Long id);

    /** Immutable downstream match-day page. */
    record DayPage(List<DayGroup> dayMatches, boolean hasNext, Integer nextPage) {

        /** Defensively copies the downstream groups. */
        public DayPage {
            dayMatches = dayMatches == null ? List.of() : List.copyOf(dayMatches);
        }
    }

    /** Immutable downstream day group. */
    record DayGroup(LocalDate date, List<PoolGroup> pools) {

        /** Defensively copies the downstream pool groups. */
        public DayGroup {
            pools = pools == null ? List.of() : List.copyOf(pools);
        }
    }

    /** Immutable downstream pool group. */
    record PoolGroup(Long poolId, List<MatchSnapshot> matches) {

        /** Defensively copies the downstream matches. */
        public PoolGroup {
            matches = matches == null ? List.of() : List.copyOf(matches);
        }
    }

    /** Match fields needed by list, detail, live, and signed-document projections. */
    record MatchSnapshot(
            Long id,
            String matchCode,
            String leagueCode,
            Long poolId,
            Long liveCode,
            Long teamIdA,
            Long teamIdB,
            Instant matchDate,
            String season,
            String set,
            String score,
            MatchStatusEnum status,
            String venue,
            String firstReferee,
            String secondReferee,
            String liveUrl,
            LiveProviderEnum liveProvider,
            String liveOwnerAuth0Id) {
    }
}
