package com.blockout.backend.following.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.following.application.FollowState;
import com.blockout.backend.following.application.ReadFollowLists;
import com.blockout.backend.following.application.ReadFollowOptions;
import com.blockout.backend.following.application.ReadFollowerCount;
import com.blockout.backend.following.application.ReadPersonalCalendar;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.api.ConsultationApiMapperImpl;
import com.blockout.backend.sporting.application.ConsultationViews;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Production following controller and generated bindings with controlled application ports. */
@WebMvcTest(controllers = FollowingController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  FollowingRequest.class,
  FollowingApiMapperImpl.class,
  ConsultationApiMapperImpl.class
})
@DisplayName("Following generated contract boundary")
public class FollowingContractWebMvcTest {
  public static final String ACCOUNT = "00000000-0000-4000-8000-000000000001";
  public static final String TARGET = "00000000-0000-4000-8000-000000000002";
  @Autowired MockMvc mvc;
  @MockitoBean FollowState state;
  @MockitoBean ReadFollowerCount counts;
  @MockitoBean ReadFollowOptions options;
  @MockitoBean ReadPersonalCalendar calendars;
  @MockitoBean ReadFollowLists lists;
  @MockitoBean CurrentAccount current;

  /**
   * Supplies the already authorized UUID; real admission is exercised by FollowAccessWebMvcTest.
   */
  @BeforeEach
  void owner() {
    when(current.findId()).thenReturn(Optional.of(UUID.fromString(ACCOUNT)));
    when(state.replace(any(), anyBoolean())).thenAnswer(invocation -> invocation.getArgument(1));
    when(counts.read(any())).thenReturn(9007199254740991L);
    when(lists.teams(any(), any(), anyLong()))
        .thenReturn(new ReadFollowLists.Teams(List.of(), null));
    when(lists.pools(any(), any(), anyLong()))
        .thenReturn(new ReadFollowLists.Pools(List.of(), null));
    when(options.read(any())).thenReturn(new ReadFollowOptions.Options(List.of(), null));
    when(calendars.read(any(), any(), any()))
        .thenReturn(
            new ReadPersonalCalendar.Calendar(
                false,
                new ConsultationViews.Calendar(
                    CalendarCategoryEnum.UPCOMING,
                    "Europe/Paris",
                    OffsetDateTime.parse("2026-10-24T00:00:00Z"),
                    List.of(),
                    null)));
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

    // When
    ResultActions unfollowing =
        mvc.perform(
            put(path).contentType(MediaType.APPLICATION_JSON).content("{\"following\":false}"));

    // Then
    unfollowing.andExpect(status().isOk()).andExpect(jsonPath("$.following").value(false));
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
    if (kind.equals("team")) verify(lists).teams(UUID.fromString(ACCOUNT), null, 0L);
    else verify(lists).pools(UUID.fromString(ACCOUNT), null, 0L);

    // When
    ResultActions selected =
        mvc.perform(get(path).param("page", "107374182").param("seasonId", TARGET));

    // Then
    selected.andExpect(status().isOk());
    if (kind.equals("team"))
      verify(lists).teams(UUID.fromString(ACCOUNT), UUID.fromString(TARGET), 107374182L);
    else verify(lists).pools(UUID.fromString(ACCOUNT), UUID.fromString(TARGET), 107374182L);
  }

  @ParameterizedTest
  @ValueSource(strings = {"-1", "107374183", "9007199254740992", "0.5", "null"})
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
        "/matches?category=unknown&timeZone=Europe/Paris",
        "/matches?category=UPCOMING&timeZone=Europe/Paris",
        "/matches?category=COMPLETED&timeZone=Europe/Paris",
        "/matches?category=upcoming&timeZone=invalid",
        "/matches?category=upcoming&timeZone=Europe/Paris&nextDay=2026-02-30",
        "/matches?category=upcoming&timeZone=Europe/Paris&timeZone=UTC"
      })
  @DisplayName("Rejects malformed generated values and non-IANA calendar zones")
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
  @DisplayName("Omits the default season from empty generated options")
  void omitsDefaultForEmptyOptions() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get("/accounts/" + ACCOUNT + "/follow-options");

    // When
    ResultActions options = mvc.perform(request);

    // Then
    options
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.seasons").isEmpty())
        .andExpect(jsonPath("$.defaultSeasonId").doesNotExist());
  }

  @Test
  @DisplayName("Serializes the exact maximum safe integer follower count")
  void serializesSafeIntegerCount() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get("/teams/" + TARGET + "/follower-count");

    // When
    ResultActions count = mvc.perform(request);

    // Then
    count.andExpect(status().isOk()).andExpect(jsonPath("$.count").value(9007199254740991L));
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
}
