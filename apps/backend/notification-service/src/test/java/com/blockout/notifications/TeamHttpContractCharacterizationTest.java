package com.blockout.notifications;

import com.blockout.notifications.notification.infrastructure.http.models.PoolInternalResponse;
import com.blockout.notifications.notification.infrastructure.http.models.TeamInternalResponse;
import com.blockout.notifications.notification.infrastructure.http.models.UserInternalResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Protects the complete Team HTTP mirror used by notification orchestration.
 */
class TeamHttpContractCharacterizationTest {

    @Test
    void readsTheCompleteTeamInternalResponse() throws Exception {
        TeamInternalResponse team = new ObjectMapper().findAndRegisterModules().readValue("""
            {"id":10,"clubId":"club-1","rawName":"RAW","name":"Blockout","shortName":"BO",
             "leagueCode":"LNV","divisionId":20,"season":"2026/2027","format":"SIX","gender":"F",
             "followersCount":3,"logoUrl":"logo","active":true,
             "createdAt":"2026-07-19T12:00:00","lastUpdate":"2026-07-19T12:00:00"}
            """, TeamInternalResponse.class);

        assertThat(team.getRawName()).isEqualTo("RAW");
        assertThat(team.getLogoUrl()).isEqualTo("logo");
        assertThat(team.getCreatedAt()).isEqualTo(team.getLastUpdate());
    }

    @Test
    void readsTheCompletePoolInternalResponse() throws Exception {
        PoolInternalResponse pool = new ObjectMapper().findAndRegisterModules().readValue("""
            {"id":1,"poolCode":"A","leagueCode":"LNV","season":"2026/2027","leagueName":"League",
             "rawName":"RAW","name":"Pool","shortName":"P","divisionId":2,"format":"SIX","gender":"F",
             "followersCount":3,"active":true,"createdAt":"2026-07-19T12:00:00",
             "lastUpdate":"2026-07-19T12:00:00"}
            """, PoolInternalResponse.class);
        assertThat(pool.getRawName()).isEqualTo("RAW");
        assertThat(pool.getCreatedAt()).isEqualTo(pool.getLastUpdate());
    }

    @Test
    void readsTheCompleteUserInternalResponse() throws Exception {
        UserInternalResponse user = new ObjectMapper().findAndRegisterModules().readValue("""
            {"id":1,"auth0Id":"auth0|1","email":"user@example.com","pseudo":"user",
             "firstName":"First","lastName":"Last","pictureUrl":"picture","phoneNumber":"phone",
             "active":true,"createdAt":"2026-07-19T12:00:00Z","lastUpdate":"2026-07-19T12:00:00Z",
             "favorites":[{"entityType":"TEAM","entityId":2}]}
            """, UserInternalResponse.class);

        assertThat(user.getAuth0Id()).isEqualTo("auth0|1");
        assertThat(user.getFavorites()).hasSize(1);
        assertThat(user.getCreatedAt()).isEqualTo(user.getLastUpdate());
    }
}
