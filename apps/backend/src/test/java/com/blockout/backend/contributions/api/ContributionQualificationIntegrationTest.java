package com.blockout.backend.contributions.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.application.EraseAccount;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.contributions.support.ContributionScenario;
import com.blockout.backend.generated.ingestion.model.ResultStateEnum;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Generated HTTP bindings over real F02/F05/F08/F12 owners and migrated PostgreSQL. Time and
 * already-validated JWT claims are controlled; no provider or native networking is exercised.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = "blockout.accounts.cleanup.environment=disabled")
@DisplayName("Integrated contribution HTTP qualification")
class ContributionQualificationIntegrationTest extends ContributionScenario {
  private static final String ISSUER = "https://identity.example.invalid/";
  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper json;
  @Autowired private EraseAccount erasure;
  @Autowired private AccountStore accounts;

  @Test
  @DisplayName("Real erasure leaves useful selected links and anonymous exact-version reports")
  void readsAnonymizedHistoryAfterSelection() throws Exception {
    // Given
    moderator(OTHER);
    UUID secondReporter = reporter(4);
    UUID thirdReporter = reporter(5);
    JsonNode source = create(AUTHOR, "0", "https://youtu.be/reported", false);
    UUID sourceId = UUID.fromString(source.at("/contribution/id").asString());
    for (UUID reporter : List.of(FOLLOWER, secondReporter, thirdReporter)) {
      mvc.perform(
              post("/accounts/" + reporter + "/stream-contributions/" + sourceId + "/report")
                  .with(principal(reporter))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"reason\":\"Synthetic private reason\"}"))
          .andExpect(status().isCreated());
    }
    JsonNode proposal = create(AUTHOR, "4", "https://twitch.tv/selected", false);
    UUID selectedId = UUID.fromString(proposal.at("/contribution/id").asString());
    mvc.perform(
            patch(member(selectedId))
                .with(principal(OTHER))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"actorAccountId\":\""
                        + OTHER
                        + "\",\"revision\":\"5\",\"action\":\"approve\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contribution.id").value(selectedId.toString()));

    // When
    erasure.erase(ISSUER, AUTHOR.toString(), AUTHOR);
    erasure.erase(ISSUER, FOLLOWER.toString(), FOLLOWER);
    erasure.erase(ISSUER, secondReporter.toString(), secondReporter);
    UUID recreated =
        new TransactionTemplate(transactions)
            .execute(
                transaction ->
                    accounts
                        .create(ISSUER, AUTHOR.toString(), "Recreated", "new@example.invalid", null)
                        .id());

    // Then
    JsonNode reports = read(get(member(sourceId) + "/reports"), OTHER);
    assertThat(reports.path("count").asLong()).isEqualTo(3);
    assertThat(reports.path("items")).hasSize(3);
    assertThat(
            reports.path("items").valueStream().filter(row -> row.path("reason").isNull()).count())
        .isEqualTo(2);
    assertThat(reports.path("items"))
        .allSatisfy(
            row -> {
              assertThat(row.has("reporterId")).isFalse();
              assertThat(row.has("authorName")).isFalse();
            });
    JsonNode old = read(get(member(sourceId)), OTHER);
    assertThat(old.at("/contribution/state").asString()).isEqualTo("hidden");
    assertThat(old.at("/contribution/reportCount").asLong()).isEqualTo(3);
    assertThat(old.at("/contribution").has("authorName")).isFalse();
    assertThat(old.at("/contribution/decisions/0").has("actorName")).isFalse();
    JsonNode current = read(get(collection()), OTHER);
    assertThat(current.at("/activeContribution/id").asString()).isEqualTo(selectedId.toString());
    assertThat(current.at("/activeContribution").has("authorName")).isFalse();
    assertThat(current.at("/counts/reports").asLong()).isZero();
    assertThat(current.path("approvalRequiredAfterReports").asBoolean()).isFalse();
    mvc.perform(get("/matches/" + matchId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.streamContributionId").value(selectedId.toString()))
        .andExpect(jsonPath("$.streamUrl").value("https://twitch.tv/selected"));
    mvc.perform(
            get("/accounts/" + recreated + "/matches/" + matchId + "/stream-contributions")
                .with(principal(AUTHOR)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.proposalCount").value(0))
        .andExpect(jsonPath("$.activeContribution").doesNotExist());
    mvc.perform(
            patch(
                    "/accounts/"
                        + recreated
                        + "/matches/"
                        + matchId
                        + "/stream-contributions/"
                        + selectedId)
                .with(principal(AUTHOR))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":\"6\",\"action\":\"withdraw\"}"))
        .andExpect(status().isNotFound());
    assertThat(contributions.active(matchId).orElseThrow().id()).isEqualTo(selectedId);
  }

  @Test
  @DisplayName("Exempt publications traverse all-state totals and literal combined private filters")
  void traversesActualVersionsWithCombinedFilters() throws Exception {
    // Given: every version is created by the production command, with the current stream-only
    // grant.
    moderator(OTHER);
    List<UUID> history = new ArrayList<>();
    for (int index = 0; index < 24; index++) {
      JsonNode created =
          create(OTHER, Integer.toString(index), "https://youtu.be/Literal_%25!" + index, true);
      history.add(UUID.fromString(created.at("/contribution/id").asString()));
    }
    JsonNode active = create(OTHER, "24", "https://twitch.tv/current", true);
    String activeId = active.at("/contribution/id").asString();
    // PostgreSQL orders UUID bytes unsigned, unlike UUID.compareTo's signed Java longs.
    history.sort(Comparator.comparing(UUID::toString));
    UUID season =
        sql.queryForObject(
            "SELECT season_id FROM sporting_pool WHERE id=?", UUID.class, scope.pool());

    // When
    JsonNode first = read(get(collection()).queryParam("state", "historical"), OTHER);
    JsonNode last =
        read(get(collection()).queryParam("state", "historical").queryParam("page", "1"), OTHER);
    JsonNode own =
        read(get("/accounts/" + OTHER + "/matches/" + matchId + "/stream-contributions"), OTHER);
    JsonNode ownLast =
        read(
            get("/accounts/" + OTHER + "/matches/" + matchId + "/stream-contributions")
                .queryParam("page", "1"),
            OTHER);
    MockHttpServletRequestBuilder filter =
        get("/administration/stream-moderation")
            .queryParam("seasonId", season.toString())
            .queryParam("query", "lITERAL_%25!")
            .queryParam("platform", "youtube")
            .queryParam("state", "replaced");
    JsonNode queue = read(filter, OTHER);

    // Then
    assertThat(first.path("items"))
        .extracting(row -> UUID.fromString(row.path("id").asString()))
        .containsExactlyElementsOf(history.subList(0, 20));
    assertThat(last.path("items"))
        .extracting(row -> UUID.fromString(row.path("id").asString()))
        .containsExactlyElementsOf(history.subList(20, 24));
    assertThat(first.path("nextPage").asLong()).isEqualTo(1);
    assertThat(last.has("nextPage")).isFalse();
    assertThat(first.at("/activeContribution/id").asString()).isEqualTo(activeId);
    assertThat(own.path("proposalCount").asLong()).isEqualTo(25);
    assertThat(own.path("items")).hasSize(20);
    assertThat(ownLast.path("items")).hasSize(5);
    assertThat(ownLast.path("proposalCount").asLong()).isEqualTo(25);
    assertThat(ownLast.has("nextPage")).isFalse();
    assertThat(own.at("/quota/versionsUsed").asLong()).isZero();
    assertThat(queue.path("items")).hasSize(1);
    assertThat(queue.at("/items/0/match/id").asString()).isEqualTo(matchId.toString());
    assertThat(queue.path("seasons")).hasSize(1);
    assertThat(
            read(
                    get("/administration/stream-moderation")
                        .queryParam("seasonId", season.toString())
                        .queryParam("query", "lITERAL_%25!")
                        .queryParam("platform", "twitch")
                        .queryParam("state", "active"),
                    OTHER)
                .path("items"))
        .isEmpty();
    assertThat(
            read(
                    get("/administration/stream-moderation")
                        .queryParam("seasonId", season.toString())
                        .queryParam("query", "lITERAL_X25!")
                        .queryParam("platform", "youtube")
                        .queryParam("state", "replaced"),
                    OTHER)
                .path("items"))
        .isEmpty();
  }

  @Test
  @DisplayName("Retained report pages preserve exact totals and anonymous facts beyond twenty")
  void traversesRetainedReports() throws Exception {
    // Given: retained historical report volume is a fixture, not a claim that thresholds allow 24
    // new reports.
    moderator(OTHER);
    SubmitContribution.Outcome historical = submit(AUTHOR, "0", "https://youtu.be/history", false);
    List<UUID> ids = new ArrayList<>();
    for (int index = 1; index <= 24; index++) {
      UUID id = new UUID(0, index);
      ids.add(id);
      sql.update(
          "INSERT INTO contribution_report(id,version_id,reason,reported_at) VALUES (?,?,NULL,?)",
          id,
          historical.version().id(),
          Timestamp.from(NOW));
    }
    create(OTHER, "1", "https://twitch.tv/selected", true);

    // When
    JsonNode first = read(get(member(historical.version().id()) + "/reports"), OTHER);
    JsonNode last =
        read(get(member(historical.version().id()) + "/reports").queryParam("page", "1"), OTHER);

    // Then
    assertThat(first.path("count").asLong()).isEqualTo(24);
    assertThat(last.path("count").asLong()).isEqualTo(24);
    assertThat(first.path("items"))
        .extracting(row -> UUID.fromString(row.path("id").asString()))
        .containsExactlyElementsOf(ids.subList(0, 20));
    assertThat(last.path("items"))
        .extracting(row -> UUID.fromString(row.path("id").asString()))
        .containsExactlyElementsOf(ids.subList(20, 24));
    assertThat(last.path("items")).allMatch(row -> row.path("reason").isNull());
    assertThat(first.path("nextPage").asLong()).isEqualTo(1);
    assertThat(last.has("nextPage")).isFalse();
    assertThat(read(get(collection()), OTHER).at("/counts/reports").asLong()).isZero();
  }

  @Test
  @DisplayName("An old private read cannot authorize approval after the current grant is revoked")
  void refusesRevokedGrantAfterRead() throws Exception {
    // Given
    moderator(OTHER);
    result(2, ResultStateEnum.FINAL);
    JsonNode pending = create(AUTHOR, "0", "https://youtu.be/pending", false);
    UUID version = UUID.fromString(pending.at("/contribution/id").asString());
    read(get(member(version)), OTHER);
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            transaction -> {
              sql.queryForObject("SELECT id FROM account WHERE id=? FOR UPDATE", UUID.class, OTHER);
              sql.update("DELETE FROM account_permission WHERE account_id=?", OTHER);
              sql.update(
                  "INSERT INTO account_permission(account_id,permission) VALUES (?,'collection.manage')",
                  OTHER);
            });

    // When
    mvc.perform(
            patch(member(version))
                .with(principal(OTHER))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"actorAccountId\":\""
                        + OTHER
                        + "\",\"revision\":\"1\",\"action\":\"approve\"}"))
        // Then
        .andExpect(status().isForbidden())
        .andExpect(header().string("Cache-Control", "no-store"));
    mvc.perform(get(member(version)).with(principal(OTHER))).andExpect(status().isForbidden());
    assertThat(contributions.pending(matchId, AUTHOR).orElseThrow().id()).isEqualTo(version);
    assertThat(contributions.state(matchId).revision()).isEqualTo(1);
    assertThat(contributions.active(matchId)).isEmpty();
  }

  @ParameterizedTest
  @CsvSource({
    "platform,unsupported",
    "platform,YOUTUBE",
    "platform,''",
    "platform,' youtube '",
    "state,unknown",
    "state,TO_REVIEW",
    "state,ACTIVE",
    "state,''",
    "state,' active '"
  })
  @DisplayName("Private queue filters reject noncanonical enum values")
  void refusesInvalidQueueFilter(String parameter, String value) throws Exception {
    // Given
    moderator(OTHER);

    // When
    mvc.perform(
            get("/administration/stream-moderation")
                .queryParam(parameter, value)
                .with(principal(OTHER)))
        // Then
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    assertThat(count("contribution_version")).isZero();
  }

  @ParameterizedTest
  @CsvSource({"unknown", "HISTORICAL", "''", "' historical '"})
  @DisplayName("Private version filters reject noncanonical enum values")
  void refusesInvalidVersionFilter(String value) throws Exception {
    // Given
    moderator(OTHER);

    // When
    mvc.perform(get(collection()).queryParam("state", value).with(principal(OTHER)))
        // Then
        .andExpect(status().isBadRequest());
    assertThat(count("contribution_version")).isZero();
  }

  @Test
  @DisplayName("The hyphenated attention filter retains a reported active link")
  void readsReportedActiveAttention() throws Exception {
    // Given
    moderator(OTHER);
    SubmitContribution.Outcome active = submit(AUTHOR, "0", "https://youtu.be/attention", false);
    mvc.perform(
            post("/accounts/"
                    + FOLLOWER
                    + "/stream-contributions/"
                    + active.version().id()
                    + "/report")
                .with(principal(FOLLOWER))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Synthetic reason\"}"))
        .andExpect(status().isCreated());

    // When
    JsonNode queue =
        read(get("/administration/stream-moderation").queryParam("state", "to-review"), OTHER);

    // Then
    assertThat(queue.path("items")).hasSize(1);
    assertThat(queue.at("/items/0/match/id").asString()).isEqualTo(matchId.toString());
    assertThat(queue.at("/items/0/counts/active").asLong()).isEqualTo(1);
    assertThat(queue.at("/items/0/counts/reports").asLong()).isEqualTo(1);
    assertThat(contributions.active(matchId).orElseThrow().id()).isEqualTo(active.version().id());
  }

  /**
   * Creates a version through the production generated HTTP binding, preserving its returned
   * identity.
   *
   * @param actor original synthetic principal and command owner
   * @param revision explicit viewed contribution revision
   * @param address locally recognized literal synthetic address
   * @param administrative whether to use direct moderator publication
   * @return acknowledged creation body
   * @throws Exception if binding, command execution or JSON decoding fails
   */
  private JsonNode create(UUID actor, String revision, String address, boolean administrative)
      throws Exception {
    String path =
        administrative
            ? collection()
            : "/accounts/" + actor + "/matches/" + matchId + "/stream-contributions";
    String owner = administrative ? "\"actorAccountId\":\"" + actor + "\"," : "";
    String body =
        mvc.perform(
                post(path)
                    .with(principal(actor))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{"
                            + owner
                            + "\"revision\":\""
                            + revision
                            + "\",\"url\":\""
                            + address
                            + "\"}"))
            .andExpect(status().isCreated())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andReturn()
            .getResponse()
            .getContentAsString();
    return json.readTree(body);
  }

  /**
   * Reads an admitted production projection without test-side filtering or sorting.
   *
   * @param request explicit route and query criteria
   * @param actor current synthetic principal
   * @return decoded no-store representation
   * @throws Exception if HTTP execution or decoding fails
   */
  private JsonNode read(MockHttpServletRequestBuilder request, UUID actor) throws Exception {
    return json.readTree(
        mvc.perform(request.with(principal(actor)))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  /**
   * @return the retained match's canonical private version collection.
   */
  private String collection() {
    return "/administration/matches/" + matchId + "/stream-contributions";
  }

  /**
   * Identifies an exact member independently of the current active version.
   *
   * @param version immutable target identity
   * @return canonical private member path
   */
  private String member(UUID version) {
    return collection() + "/" + version;
  }

  /**
   * Creates only a synthetic existing account; actual reports remain explicit at call sites.
   *
   * @param number stable fixture identity suffix
   * @return newly persisted usable reporter
   */
  private UUID reporter(int number) {
    UUID id = new UUID(0, number);
    sql.update(
        "INSERT INTO account(id,issuer,subject,username,email) VALUES (?,?,?,?,'synthetic@example.invalid')",
        id,
        ISSUER,
        id.toString(),
        "Reporter" + number);
    return id;
  }

  /**
   * Supplies validated synthetic claims; the signature/JWKS boundary has its own qualification.
   *
   * @param subject exact subject belonging to the current or deliberately recreated account
   * @return request-scoped security principal
   */
  private static RequestPostProcessor principal(UUID subject) {
    return jwt()
        .jwt(token -> token.issuer(ISSUER).subject(subject.toString()).claim("azp", "mobile-test"));
  }
}
