package com.blockout.notifications;

import com.blockout.notifications.models.dto.team.TeamDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Protects the complete Team HTTP mirror used by notification orchestration. */
class TeamHttpContractCharacterizationTest {

    @Test
    void readsTheCompleteTeamInternalResponse() throws Exception {
        TeamDTO team = new ObjectMapper().findAndRegisterModules().readValue("""
                {"id":10,"clubId":"club-1","rawName":"RAW","name":"Blockout","shortName":"BO",
                 "leagueCode":"LNV","divisionId":20,"season":"2026/2027","format":"SIX","gender":"F",
                 "followersCount":3,"logoUrl":"logo","active":true,
                 "createdAt":"2026-07-19T12:00:00","lastUpdate":"2026-07-19T12:00:00"}
                """, TeamDTO.class);

        assertThat(team.getRawName()).isEqualTo("RAW");
        assertThat(team.getLogoUrl()).isEqualTo("logo");
        assertThat(team.getCreatedAt()).isEqualTo(team.getLastUpdate());
    }
}
