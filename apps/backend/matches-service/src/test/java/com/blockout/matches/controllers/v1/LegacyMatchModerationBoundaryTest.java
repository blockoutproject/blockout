package com.blockout.matches.controllers.v1;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.matches.match.live.moderation.application.MatchLiveModerationApplicationService;
import com.blockout.matches.match.live.moderation.persistence.MatchLiveModerationPersistenceMapper;
import com.blockout.matches.match.persistence.Match;
import com.blockout.matches.match.persistence.MatchRepository;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.shared.api.v1.LegacyMatchesJson;
import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class LegacyMatchModerationBoundaryTest {

    @Test
    void moderationAdapterKeepsTheUnpagedSnakeCaseArrayAndLegacyOnlyFields() throws Exception {
        Instant now = Instant.parse("2026-07-17T10:00:00Z");
        Match match = Match.builder().id(1L).matchCode("M1").leagueCode("L1").poolId(9L)
                .teamIdA(10L).teamIdB(11L).matchDate(now).season("2026").status(MatchStatus.FINISHED)
                .liveCode(42L).active(true).createdAt(now).lastUpdate(now).build();
        MatchLiveLink link = MatchLiveLink.builder().id(100L).match(match).ownerAuth0Id("auth0|owner")
                .provider(LiveProvider.YOUTUBE).url("https://youtu.be/a").status(LiveLinkStatus.ACTIVE)
                .createdAt(now).lastUpdate(now).build();
        match.setLiveLinks(List.of(link));
        MatchRepository matches = (MatchRepository) Proxy.newProxyInstance(
                MatchRepository.class.getClassLoader(), new Class<?>[]{MatchRepository.class},
                (proxy, method, arguments) -> switch (method.getName()) {
                    case "findAllWithLiveLinks" -> List.of(match);
                    case "toString" -> "MatchRepositoryDouble";
                    default -> throw new UnsupportedOperationException(method.getName());
                });
        MatchLiveLinkRepository liveLinks = (MatchLiveLinkRepository) Proxy.newProxyInstance(
                MatchLiveLinkRepository.class.getClassLoader(), new Class<?>[]{MatchLiveLinkRepository.class},
                (proxy, method, arguments) -> {
                    if (method.getName().equals("toString")) {
                        return "LiveLinkRepositoryDouble";
                    }
                    throw new UnsupportedOperationException(method.getName());
                });
        var service = new MatchLiveModerationApplicationService(
                matches, liveLinks, Mappers.getMapper(MatchLiveModerationPersistenceMapper.class),
                Clock.fixed(now, ZoneOffset.UTC));
        var controller = new MatchController(null, null, service, new LegacyMatchesJson());

        String body = controller.listMatchesForLiveModeration(LiveLinkStatus.ACTIVE).getBody();

        assertThat(body).startsWith("[").endsWith("]");
        assertThat(body).contains("\"match_code\":\"M1\"", "\"league_code\":\"L1\"",
                "\"pool_id\":9", "\"last_live_link_status\":\"ACTIVE\"");
        assertThat(body).doesNotContain("pageInfo", "matchCode", "lastLiveLinkStatus");
    }
}
