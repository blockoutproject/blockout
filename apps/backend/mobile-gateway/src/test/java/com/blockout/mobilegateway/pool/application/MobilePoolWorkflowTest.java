package com.blockout.mobilegateway.pool.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.mobilegateway.club.application.MobileClubGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationWorkflow;
import com.blockout.mobilegateway.shared.application.MobileCompetitionProjectionGateway;
import com.blockout.mobilegateway.shared.application.MobileRankingTeamView;
import com.blockout.mobilegateway.team.application.MobileTeamGateway;
import java.lang.reflect.Proxy;
import java.util.List;
import org.junit.jupiter.api.Test;

class MobilePoolWorkflowTest {

    @Test
    void buildsRequiredDetailWithStableRankingAndClubFallbacks() {
        MobilePoolGateway pools = proxy(MobilePoolGateway.class, (proxy, method, args) -> pool());
        MobileTeamGateway teams = proxy(MobileTeamGateway.class, (proxy, method, args) -> team((Long) args[0]));
        MobileClubGateway clubs = proxy(MobileClubGateway.class, (proxy, method, args) -> club((String) args[0]));
        MobileConfigurationGateway configuration = proxy(MobileConfigurationGateway.class,
                (proxy, method, args) -> division());
        MobileCompetitionProjectionGateway competition = proxy(MobileCompetitionProjectionGateway.class,
                (proxy, method, args) -> List.of(
                        association(1L, 4, 0, 2, 1.1, 1.2),
                        association(2L, 7, 0, 1, 1.0, 1.0),
                        association(3L, 4, 0, 2, 1.1, 1.2)));

        var result = new MobilePoolWorkflow(pools, teams, clubs, configuration, competition).get(10L);

        assertThat(result.ranking()).extracting(MobileRankingTeamView::id).containsExactly(2L, 1L, 3L);
        assertThat(result.ranking().get(1).logoUrl()).isEqualTo("https://cdn.example/club-1.png");
        assertThat(result.ranking().get(1).latitude()).isEqualTo(48.1);
        assertThat(result.division().name()).isEqualTo("Division");
    }

    private static MobileCompetitionProjectionGateway.Association association(
            Long teamId, int points, int penalty, int wins, double coefSets, double coefPoints) {
        return new MobileCompetitionProjectionGateway.Association(
                teamId, points, 3, wins, 3 - wins, penalty, coefSets, coefPoints);
    }

    private static MobilePoolGateway.Snapshot pool() {
        return new MobilePoolGateway.Snapshot(
                10L, "P", "L", "2026", "League", "Raw pool", "Pool", "PL", 50L, null, null, 2L, true);
    }

    private static MobileTeamGateway.Snapshot team(Long id) {
        return new MobileTeamGateway.Snapshot(
                id, "club-" + id, "Raw team", "Team " + id, "T" + id, "L", 50L, "2026", null, null, 0L,
                id == 2L ? "https://cdn.example/team-2.png" : null, true);
    }

    private static MobileClubGateway.Snapshot club(String id) {
        return new MobileClubGateway.Snapshot(
                id, "Raw club", "Club", null, null, null, null, "https://cdn.example/" + id + ".png", 48.1, 2.1);
    }

    private static MobileConfigurationWorkflow.DivisionView division() {
        return new MobileConfigurationWorkflow.DivisionView(
                50L, "Division", "#000000", "#111111", "#222222", "#333333", null, true);
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] {type}, handler);
    }
}
