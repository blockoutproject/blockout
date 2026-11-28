package com.blockout.backend.contributions.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.contributions.application.ChangeOwnContribution;
import com.blockout.backend.contributions.application.ContributionContext;
import com.blockout.backend.contributions.application.ContributionRejectedException;
import com.blockout.backend.contributions.application.ReadOwnContributions;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.contributions.application.SubmitModeratedContribution;
import com.blockout.backend.contributions.domain.ContributionEligibility;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Real generated MVC routes, feature/shared advice and Boot ECS; application I/O is controlled. */
@WebMvcTest(ContributionsController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
  ContributionApiMapperImpl.class,
  ContributionExceptionHandler.class,
  ApiExceptionHandler.class
})
@ExtendWith(OutputCaptureExtension.class)
@DisplayName("Contribution failure ownership and diagnostic privacy")
class ContributionFailureLoggingTest {
  private static final UUID OWNER = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final String PATH =
      "/accounts/" + OWNER + "/matches/00000000-0000-4000-8000-000000000002/stream-contributions";
  private static final String PRIVATE =
      "https://youtu.be/private?token=synthetic-secret private-reason auth0|private payload";
  @Autowired private MockMvc mvc;
  @MockitoBean private ContributionRequest request;
  @MockitoBean private SubmitContribution submissions;
  @MockitoBean private ReadOwnContributions reads;
  @MockitoBean private SubmitModeratedContribution moderated;
  @MockitoBean private ChangeOwnContribution changes;

  /** Supplies original account context while the application outcome remains scenario-owned. */
  @BeforeEach
  void originalAccount() {
    when(request.current()).thenReturn(new ContributionContext(OWNER, false));
  }

  @ParameterizedTest
  @CsvSource({
    "FORBIDDEN,403,forbidden",
    "STALE_REVISION,409,stale-revision",
    "VERSION_LIMIT,422,unprocessable-content"
  })
  @DisplayName("Keeps business refusals opaque without an unexpected-failure diagnostic")
  void refusesWithoutTechnicalDiagnostic(
      ContributionEligibility.Status refusal, int code, String type, CapturedOutput output)
      throws Exception {
    // Given
    when(submissions.submit(any(), any(), any(), any(), anyBoolean()))
        .thenThrow(new ContributionRejectedException(refusal));

    // When
    ResultActions response =
        mvc.perform(
            post(PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"revision\":\"viewed\",\"url\":\"https://youtu.be/private?token=synthetic-secret\"}"));

    // Then
    response
        .andExpect(status().is(code))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:" + type))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.detail").doesNotExist());
    assertThat(events(output)).isEmpty();
    assertThat(output.getAll())
        .doesNotContain("synthetic-secret", "private-reason", "auth0|private");
  }

  @ParameterizedTest
  @CsvSource({
    "true,true,503,unavailable",
    "true,false,500,failed",
    "false,true,503,unavailable",
    "false,false,500,failed"
  })
  @DisplayName("Shared F13 advice owns one safe diagnostic for an unexpected read or write failure")
  void recordsFailureOnce(
      boolean mutation, boolean unavailable, int code, String outcome, CapturedOutput output)
      throws Exception {
    // Given
    RuntimeException failure =
        unavailable
            ? new DataAccessResourceFailureException(PRIVATE)
            : new InvalidDataAccessResourceUsageException(PRIVATE);
    if (mutation) {
      when(submissions.submit(any(), any(), any(), any(), anyBoolean())).thenThrow(failure);
    } else {
      when(reads.read(OWNER, UUID.fromString("00000000-0000-4000-8000-000000000002"), 0))
          .thenThrow(failure);
    }

    // When
    ResultActions response =
        mutation
            ? mvc.perform(
                post(PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"revision\":\"viewed\",\"url\":\"https://youtu.be/private?token=synthetic-secret\"}"))
            : mvc.perform(get(PATH).queryParam("private-reason", "synthetic-secret"));

    // Then
    response
        .andExpect(status().is(code))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(jsonPath("$.instance").doesNotExist());
    List<JsonNode> events = events(output);
    assertThat(events).hasSize(1);
    assertThat(events.getFirst().path("operation").asText()).isEqualTo("http_request");
    assertThat(events.getFirst().path("outcome").asText()).isEqualTo(outcome);
    assertThat(events.getFirst().path("error").path("type").asText())
        .isEqualTo(failure.getClass().getName());
    assertThat(output.getAll())
        .doesNotContain(
            "youtu.be", "synthetic-secret", "private-reason", "auth0|private", OWNER.toString());
  }

  /** Selects structured events from the actual shared HTTP boundary, excluding startup output. */
  private static List<JsonNode> events(CapturedOutput output) {
    JsonMapper json = JsonMapper.builder().build();
    return output
        .getOut()
        .lines()
        .filter(line -> line.startsWith("{"))
        .map(json::readTree)
        .filter(event -> event.path("operation").asText().equals("http_request"))
        .toList();
  }
}
