package com.blockout.mobilegateway.team.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.mobilegateway.club.application.MobileClubGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationGateway;
import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.pool.application.MobilePoolGateway;
import com.blockout.mobilegateway.shared.application.MobileCompetitionProjectionGateway;
import java.lang.reflect.Proxy;
import java.util.List;
import org.junit.jupiter.api.Test;

class MobileTeamWorkflowTest {

    @Test
    void listByIdsKeepsActiveTeamWhenOptionalClubEnrichmentIsMissing() {
        MobileTeamGateway teams = proxy(MobileTeamGateway.class, (proxy, method, args) -> switch (method.getName()) {
            case "find" -> Long.valueOf(1L).equals(args[0]) ? team(1L, null) : null;
            default -> throw new UnsupportedOperationException(method.getName());
        });
        MobileClubGateway clubs = proxy(MobileClubGateway.class, (proxy, method, args) -> null);

        var result = workflow(teams, clubs).listByIds(List.of(1L, 1L, 99L));

        assertThat(result).singleElement().satisfies(team -> {
            assertThat(team.id()).isEqualTo(1L);
            assertThat(team.logoUrl()).isNull();
            assertThat(team.division()).isNull();
        });
    }

    @Test
    void listByClubRequiresClubOnlyWhenItOwnsTheLogoFallback() {
        MobileTeamGateway teams = proxy(MobileTeamGateway.class, (proxy, method, args) -> switch (method.getName()) {
            case "listActiveByClub" -> List.of(team(1L, null));
            default -> throw new UnsupportedOperationException(method.getName());
        });
        MobileClubGateway clubs = proxy(MobileClubGateway.class, (proxy, method, args) -> null);

        assertThatThrownBy(() -> workflow(teams, clubs).listByClub("club-1"))
                .isInstanceOf(InconsistentStateException.class)
                .hasMessageContaining("club-1")
                .hasMessageContaining("team 1");
    }

    private static MobileTeamWorkflow workflow(MobileTeamGateway teams, MobileClubGateway clubs) {
        MobilePoolGateway pools = proxy(MobilePoolGateway.class,
                (proxy, method, args) -> { throw new UnsupportedOperationException(method.getName()); });
        MobileConfigurationGateway configuration = proxy(MobileConfigurationGateway.class,
                (proxy, method, args) -> null);
        MobileCompetitionProjectionGateway competition = proxy(MobileCompetitionProjectionGateway.class,
                (proxy, method, args) -> List.of());
        return new MobileTeamWorkflow(teams, clubs, pools, configuration, competition);
    }

    private static MobileTeamGateway.Snapshot team(Long id, String logoUrl) {
        return new MobileTeamGateway.Snapshot(
                id, "club-1", "Raw team", "Team", "TM", "L", null, "2026", null, null, 0L, logoUrl, true);
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] {type}, handler);
    }
}
