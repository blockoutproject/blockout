package com.blockout.backend.following.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.following.api.FollowingRequest.QueryShape;
import com.blockout.backend.following.application.FollowContext;
import com.blockout.backend.generated.mobile.api.FollowingApi;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.generated.mobile.model.FollowOptionsResponse;
import com.blockout.backend.generated.mobile.model.FollowStateResponse;
import com.blockout.backend.generated.mobile.model.FollowerCountResponse;
import com.blockout.backend.generated.mobile.model.MatchCalendarResponse;
import com.blockout.backend.generated.mobile.model.PersonalMatchCalendarResponse;
import com.blockout.backend.generated.mobile.model.PoolFollowsResponse;
import com.blockout.backend.generated.mobile.model.ReplaceFollowStateRequest;
import com.blockout.backend.generated.mobile.model.TeamFollowsResponse;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.RestController;

/** Real generated MVC bindings with controlled responses, without persisted following behavior. */
@WebMvcTest(controllers = FollowingContractWebMvcTest.Adapter.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  FollowingRequest.class,
  FollowingWebConfiguration.class,
  FollowingContractWebMvcTest.Adapter.class
})
@DisplayName("Following generated contract boundary")
public class FollowingContractWebMvcTest {
  public static final String ACCOUNT = "00000000-0000-4000-8000-000000000001";
  public static final String TARGET = "00000000-0000-4000-8000-000000000002";
  @Autowired MockMvc mvc;
  @Autowired Adapter adapter;
  @MockitoBean CurrentAccount current;

  /**
   * Supplies the already authorized UUID; real admission is exercised by FollowAccessWebMvcTest.
   */
  @BeforeEach
  void owner() {
    adapter.page = null;
    adapter.season = null;
    when(current.id()).thenReturn(UUID.fromString(ACCOUNT));
  }

  @ParameterizedTest
  @ValueSource(strings = {"team", "pool"})
  @DisplayName("Binds required complete true and false state through generated interfaces")
  void bindsBoolean(String kind) throws Exception {
    // Given
    String path = "/accounts/" + ACCOUNT + "/" + kind + "-follows/" + TARGET;

    // When
    ResultActions response =
        mvc.perform(
            put(path).contentType(MediaType.APPLICATION_JSON).content("{\"following\":true}"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.following").value(true))
        .andExpect(header().string("Cache-Control", "no-store"));
    mvc.perform(put(path).contentType(MediaType.APPLICATION_JSON).content("{\"following\":false}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.following").value(false));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "null",
        "{\"following\":null}",
        "{\"following\":1}",
        "{\"following\":\"true\"}",
        "{\"following\":true,\"extra\":1}"
      })
  @DisplayName("Rejects missing, null, coerced or additive request state")
  void rejectsBody(String body) throws Exception {
    // Given
    String path = "/accounts/" + ACCOUNT + "/team-follows/" + TARGET;

    // When
    ResultActions response =
        mvc.perform(put(path).contentType(MediaType.APPLICATION_JSON).content(body));

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
  }

  @ParameterizedTest
  @ValueSource(strings = {"team", "pool"})
  @DisplayName("Keeps absent season and exhausted continuation distinct from values")
  void preservesAbsence(String kind) throws Exception {
    // Given
    String path = "/accounts/" + ACCOUNT + "/" + kind + "-follows";

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isEmpty())
        .andExpect(jsonPath("$.nextPage").doesNotExist());
    assertThat(adapter.page).isZero();
    assertThat(adapter.season).isNull();
    mvc.perform(get(path).param("page", "107374182").param("seasonId", TARGET))
        .andExpect(status().isOk());
    assertThat(adapter.page).isEqualTo(107374182L);
    assertThat(adapter.season).isEqualTo(UUID.fromString(TARGET));
  }

  @ParameterizedTest
  @ValueSource(strings = {"-1", "107374183", "9007199254740992", "0.5", "null", "0x10", "1 2"})
  @DisplayName("Rejects pages outside the generated native offset bound")
  void rejectsPage(String page) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        get("/accounts/" + ACCOUNT + "/team-follows").param("page", page);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/team-follows?future=1",
        "/pool-follows?page=0&page=1",
        "/team-follows?seasonId=",
        "/team-follows?seasonId=1-1-1-1-1",
        "/team-follows?page=",
        "/follow-options?seasonId=",
        "/matches?category=unknown&timeZone=Europe/Paris",
        "/matches?category=upcoming&timeZone=invalid",
        "/matches?category=upcoming&timeZone=Europe/Paris&nextDay=2026-02-30",
        "/matches?category=upcoming&timeZone=Europe/Paris&unknown=1",
        "/matches?category=upcoming&timeZone=Europe/Paris&timeZone=UTC"
      })
  @DisplayName("Rejects undeclared, repeated or coerced query shapes")
  void rejectsQuery(String suffix) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get("/accounts/" + ACCOUNT + suffix);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
  }

  @Test
  @DisplayName("Preserves generated options omission and exact safe integer counts")
  void serializesOptionsAndCount() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get("/accounts/" + ACCOUNT + "/follow-options");

    // When
    ResultActions options = mvc.perform(request);

    // Then
    options
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.seasons").isEmpty())
        .andExpect(jsonPath("$.defaultSeasonId").doesNotExist());
    mvc.perform(get("/teams/" + TARGET + "/follower-count"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.count").value(9007199254740991L));
  }

  @Test
  @DisplayName("Rejects unsupported mutation media types")
  void rejectsMediaType() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        put("/accounts/" + ACCOUNT + "/pool-follows/" + TARGET)
            .contentType(MediaType.TEXT_PLAIN)
            .content("true");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isUnsupportedMediaType())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unsupported-media-type"));
  }

  @Test
  @DisplayName("Binds the reused personal calendar without losing its required envelope")
  void bindsCalendar() throws Exception {
    // Given
    String path = "/accounts/" + ACCOUNT + "/matches";

    // When
    ResultActions response =
        mvc.perform(
            get(path)
                .param("category", "upcoming")
                .param("timeZone", "Europe/Paris")
                .param("nextDay", "2026-10-25"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.hasAvailableFollows").value(false))
        .andExpect(jsonPath("$.calendar.category").value("upcoming"))
        .andExpect(jsonPath("$.calendar.nextDay").doesNotExist());
  }

  /** Test-only provider of the real generated interface; no production endpoint is registered. */
  @RestController
  public static class Adapter implements FollowingApi {
    private final HttpServletRequest request;
    private final FollowingRequest requests;
    Long page;
    UUID season;

    /**
     * Supplies the feature binder and current request; endpoint responses remain controlled.
     *
     * @param request native current request used to inspect uncollapsed query values
     * @param requests production original-owner and query binding
     */
    public Adapter(HttpServletRequest request, FollowingRequest requests) {
      this.request = request;
      this.requests = requests;
    }

    /**
     * Adds the canonical cache policy to a controlled generated response.
     *
     * @param body test-owned generated response
     * @param <T> generated body type
     * @return the non-cacheable successful representation
     */
    private <T> ResponseEntity<T> response(T body) {
      return ResponseEntity.ok().header("Cache-Control", "no-store").body(body);
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<FollowStateResponse> getTeamFollowState(
        UUID accountId, UUID teamId, Boolean bypass) {
      requests.validateQuery(request, QueryShape.MEMBER);
      requests.member(accountId, FollowContext.TargetType.TEAM, teamId);
      return response(new FollowStateResponse(false));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<FollowStateResponse> replaceTeamFollowState(
        UUID accountId, UUID teamId, ReplaceFollowStateRequest body, Boolean bypass) {
      requests.validateQuery(request, QueryShape.MEMBER);
      requests.member(accountId, FollowContext.TargetType.TEAM, teamId);
      return response(new FollowStateResponse(body.getFollowing()));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<FollowerCountResponse> getTeamFollowerCount(UUID teamId, Boolean bypass) {
      requests.validateQuery(request, QueryShape.MEMBER);
      return response(new FollowerCountResponse(9007199254740991L));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<TeamFollowsResponse> listTeamFollows(
        UUID accountId, Boolean bypass, UUID seasonId, Long page) {
      requests.validateQuery(request, QueryShape.LIST);
      requests.requireOwner(accountId);
      this.page = page;
      this.season = seasonId;
      return response(new TeamFollowsResponse(List.of()));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<FollowStateResponse> getPoolFollowState(
        UUID accountId, UUID poolId, Boolean bypass) {
      requests.validateQuery(request, QueryShape.MEMBER);
      requests.member(accountId, FollowContext.TargetType.POOL, poolId);
      return response(new FollowStateResponse(false));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<FollowStateResponse> replacePoolFollowState(
        UUID accountId, UUID poolId, ReplaceFollowStateRequest body, Boolean bypass) {
      requests.validateQuery(request, QueryShape.MEMBER);
      requests.member(accountId, FollowContext.TargetType.POOL, poolId);
      return response(new FollowStateResponse(body.getFollowing()));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<FollowerCountResponse> getPoolFollowerCount(UUID poolId, Boolean bypass) {
      requests.validateQuery(request, QueryShape.MEMBER);
      return response(new FollowerCountResponse(9007199254740991L));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<PoolFollowsResponse> listPoolFollows(
        UUID accountId, Boolean bypass, UUID seasonId, Long page) {
      requests.validateQuery(request, QueryShape.LIST);
      requests.requireOwner(accountId);
      this.page = page;
      this.season = seasonId;
      return response(new PoolFollowsResponse(List.of()));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<FollowOptionsResponse> getFollowOptions(UUID accountId, Boolean bypass) {
      requests.validateQuery(request, QueryShape.MEMBER);
      requests.requireOwner(accountId);
      return response(new FollowOptionsResponse(List.of()));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<PersonalMatchCalendarResponse> listPersonalMatches(
        UUID accountId,
        CalendarCategoryEnum category,
        String timeZone,
        Boolean bypass,
        UUID seasonId,
        LocalDate nextDay) {
      requests.validateQuery(request, QueryShape.CALENDAR);
      requests.requireOwner(accountId);
      return response(
          new PersonalMatchCalendarResponse(
              false,
              new MatchCalendarResponse(
                  CalendarCategoryEnum.UPCOMING,
                  "Europe/Paris",
                  java.time.OffsetDateTime.parse("2026-10-24T00:00:00Z"),
                  List.of())));
    }
  }
}
