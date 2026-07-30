package com.blockout.workersearch.projection;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.workersearch.projection.application.models.Format;
import com.blockout.workersearch.projection.application.models.Gender;
import com.blockout.workersearch.projection.infrastructure.http.contract.config.models.DivisionInternalResponse;
import com.blockout.workersearch.projection.infrastructure.http.contract.models.ClubInternalResponse;
import com.blockout.workersearch.projection.infrastructure.http.contract.pool.models.PoolInternalResponse;
import com.blockout.workersearch.projection.infrastructure.http.contract.team.models.TeamInternalResponse;
import com.blockout.workersearch.projection.infrastructure.messaging.messages.TeamUpsertMessage;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class ProjectionTransportContractUnitTest {

  @Test
  void keepsTheExistingTeamEventPayloadInCamelCase() throws Exception {
    var event =
        new TeamUpsertMessage(
            10L,
            "Blockout",
            "BO",
            "club-1",
            20L,
            Format.SIX,
            Gender.F,
            "2026/2027",
            "https://example.invalid/team.png");

    Message message = new JacksonJsonMessageConverter().toMessage(event, new MessageProperties());
    var json = JsonMapper.builder().build().readTree(new String(message.getBody(), UTF_8));

    assertThat(json.path("shortName").asText()).isEqualTo("BO");
    assertThat(json.path("clubId").asText()).isEqualTo("club-1");
    assertThat(json.path("divisionId").asLong()).isEqualTo(20L);
    assertThat(json.path("logoUrl").asText()).isEqualTo("https://example.invalid/team.png");
    assertThat(json.has("short_name")).isFalse();
  }

  @Test
  void readsTheCompleteClubInternalResponse() throws Exception {
    ClubInternalResponse club =
        mapper()
            .readValue(
                """
            {
              "id":"club-1","rawName":"RAW","name":"Club","address":"1 Club Street",
              "city":"Paris","postalCode":"75001","email":"mail","phoneNumber":"phone",
              "website":"website","logoUrl":"logo","active":true,"latitude":48.0,"longitude":2.0,
              "createdAt":"2026-07-19T12:00:00","lastUpdate":"2026-07-19T12:00:00"
            }
            """,
                ClubInternalResponse.class);

    assertThat(club.getAddress()).isEqualTo("1 Club Street");
    assertThat(club.getLatitude()).isEqualTo(48.0);
    assertThat(club.getCreatedAt()).isEqualTo(club.getLastUpdate());
    assertThat(club.getActive()).isTrue();
  }

  @Test
  void readsTheGeneratedDivisionInternalResponse() throws Exception {
    DivisionInternalResponse division =
        mapper()
            .readValue(
                """
            {"id":20,"name":"National","mainColor":"#1","firstGradientColor":"#2",
             "secondGradientColor":"#3","thirdGradientColor":"#4","logoUrl":"logo",
             "active":true,"createdAt":"2026-07-19T12:00:00","lastUpdate":"2026-07-19T12:00:00"}
            """,
                DivisionInternalResponse.class);

    assertThat(division.getName()).isEqualTo("National");
    assertThat(division.getLogoUrl()).isEqualTo("logo");
    assertThat(division.getActive()).isTrue();
  }

  @Test
  void readsTheCompleteTeamInternalResponse() throws Exception {
    TeamInternalResponse team =
        mapper()
            .readValue(
                """
            {"id":10,"clubId":"club-1","rawName":"RAW","name":"Blockout","shortName":"BO",
             "leagueCode":"LNV","divisionId":20,"season":"2026/2027","format":"SIX","gender":"F",
             "followersCount":3,"logoUrl":"logo","active":true,
             "createdAt":"2026-07-19T12:00:00","lastUpdate":"2026-07-19T12:00:00"}
            """,
                TeamInternalResponse.class);

    assertThat(team.getRawName()).isEqualTo("RAW");
    assertThat(team.getLogoUrl()).isEqualTo("logo");
    assertThat(team.getCreatedAt()).isEqualTo(team.getLastUpdate());
  }

  @Test
  void readsTheCompletePoolInternalResponse() throws Exception {
    PoolInternalResponse pool =
        mapper()
            .readValue(
                """
            {"id":1,"poolCode":"A","leagueCode":"LNV","season":"2026/2027","leagueName":"League",
             "rawName":"RAW","name":"Pool","shortName":"P","divisionId":2,"format":"SIX","gender":"F",
             "followersCount":3,"active":true,"createdAt":"2026-07-19T12:00:00",
             "lastUpdate":"2026-07-19T12:00:00"}
            """,
                PoolInternalResponse.class);

    assertThat(pool.getRawName()).isEqualTo("RAW");
    assertThat(pool.getCreatedAt()).isEqualTo(pool.getLastUpdate());
  }

  private ObjectMapper mapper() {
    return JsonMapper.builder().findAndAddModules().build();
  }
}
