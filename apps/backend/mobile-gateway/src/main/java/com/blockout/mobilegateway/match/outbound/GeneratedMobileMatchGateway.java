package com.blockout.mobilegateway.match.outbound;

import com.blockout.mobilegateway.match.application.MobileMatchGateway;
import com.blockout.mobilegateway.matchesclient.api.MatchDaysClient;
import com.blockout.mobilegateway.matchesclient.api.MatchesClient;
import com.blockout.mobilegateway.matchesclient.model.MatchDayGroup;
import com.blockout.mobilegateway.matchesclient.model.MatchDayPageResponse;
import com.blockout.mobilegateway.matchesclient.model.MatchDayPoolGroup;
import com.blockout.mobilegateway.matchesclient.model.MatchDetailInternalResponse;
import com.blockout.mobilegateway.shared.outbound.DownstreamClientSupport;
import com.blockout.shared.model.MatchStatusEnum;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/** Adapts the generated matches-service clients to the match application port. */
@Component
public class GeneratedMobileMatchGateway implements MobileMatchGateway {

    private final MatchDaysClient matchDaysUser;
    private final MatchDaysClient matchDaysM2m;
    private final MatchesClient matchesUser;
    private final MatchesClient matchesM2m;

    /** Creates the adapter with user-forwarding and M2M read transports. */
    public GeneratedMobileMatchGateway(
            @Qualifier("matchDaysUserClient") MatchDaysClient matchDaysUser,
            @Qualifier("matchDaysM2mClient") MatchDaysClient matchDaysM2m,
            @Qualifier("matchesUserClient") MatchesClient matchesUser,
            @Qualifier("matchesM2mClient") MatchesClient matchesM2m) {
        this.matchDaysUser = matchDaysUser;
        this.matchDaysM2m = matchDaysM2m;
        this.matchesUser = matchesUser;
        this.matchesM2m = matchesM2m;
    }

    /** Loads and maps one canonical match-day page. */
    @Override
    public DayPage listDays(MatchStatusEnum status, int page, int pageSize, List<Long> poolIds, List<Long> teamIds) {
        MatchDayPageResponse response = matchDays().listMatchDayGroups(
                page, pageSize, emptyToNull(poolIds), emptyToNull(teamIds), status, true);
        if (response == null) {
            return new DayPage(List.of(), false, null);
        }
        return new DayPage(
                response.getDayMatches().stream().map(GeneratedMobileMatchGateway::day).toList(),
                Boolean.TRUE.equals(response.getHasNext()),
                response.getNextPage());
    }

    /** Loads and maps one match, preserving the nullable not-found boundary. */
    @Override
    public MatchSnapshot find(Long id) {
        return snapshot(DownstreamClientSupport.nullableWhenNotFound(() -> matches().getMatch(id)));
    }

    private static DayGroup day(MatchDayGroup value) {
        return new DayGroup(value.getDate(), value.getPools().stream().map(GeneratedMobileMatchGateway::pool).toList());
    }

    private static PoolGroup pool(MatchDayPoolGroup value) {
        return new PoolGroup(
                value.getPoolId(), value.getMatches().stream().map(GeneratedMobileMatchGateway::snapshot).toList());
    }

    private static MatchSnapshot snapshot(MatchDetailInternalResponse value) {
        if (value == null) {
            return null;
        }
        return new MatchSnapshot(
                value.getId(),
                value.getMatchCode(),
                value.getLeagueCode(),
                value.getPoolId(),
                value.getLiveCode(),
                value.getTeamIdA(),
                value.getTeamIdB(),
                value.getMatchDate(),
                value.getSeason(),
                value.getSet(),
                value.getScore(),
                value.getStatus(),
                value.getVenue(),
                value.getFirstReferee(),
                value.getSecondReferee(),
                value.getLiveUrl(),
                value.getLiveProvider(),
                value.getLiveOwnerAuth0Id());
    }

    private static <T> List<T> emptyToNull(List<T> values) {
        return values == null || values.isEmpty() ? null : values;
    }

    private MatchDaysClient matchDays() {
        return DownstreamClientSupport.hasUserJwt() ? matchDaysUser : matchDaysM2m;
    }

    private MatchesClient matches() {
        return DownstreamClientSupport.hasUserJwt() ? matchesUser : matchesM2m;
    }
}
