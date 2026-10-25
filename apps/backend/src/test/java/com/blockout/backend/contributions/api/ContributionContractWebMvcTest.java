package com.blockout.backend.contributions.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.CreateModeratedStreamContributionRequest;
import com.blockout.backend.generated.mobile.model.CreateStreamContributionRequest;
import com.blockout.backend.generated.mobile.model.CreateStreamReactivationRequest;
import com.blockout.backend.generated.mobile.model.CreateStreamReportRequest;
import com.blockout.backend.generated.mobile.model.UpdateModeratedStreamContributionRequest;
import com.blockout.backend.generated.mobile.model.UpdateOwnStreamContributionRequest;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import jakarta.validation.Valid;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Generated request binding through MVC adapters; business effects and persistence are outside this
 * slice. Response serialization and explicit Bean Validation belong to
 * ContributionContractJsonTest.
 */
@WebMvcTest(controllers = ContributionContractWebMvcTest.BindingAdapter.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  ContributionContractWebMvcTest.BindingAdapter.class
})
@DisplayName("Generated contribution contract consumers")
class ContributionContractWebMvcTest {
  private static final String ID = "00000000-0000-4000-8000-000000000223";
  @Autowired private MockMvc mvc;
  @Autowired private JsonMapper mapper;

  /**
   * Supplies complete requests with decisive command fields visible.
   *
   * @return route and valid body for each generated command
   */
  static Stream<Arguments> commands() {
    return Stream.of(
        Arguments.of(
            "submit", "{\"revision\":\"opaque:a\",\"url\":\"https://twitch.tv/synthetic\"}"),
        Arguments.of("owner", "{\"revision\":\"opaque:a\",\"action\":\"cancel\"}"),
        Arguments.of(
            "publish",
            "{\"actorAccountId\":\""
                + ID
                + "\",\"revision\":\"opaque:a\",\"url\":\"https://fb.watch/synthetic\"}"),
        Arguments.of(
            "moderate",
            "{\"actorAccountId\":\"" + ID + "\",\"revision\":\"opaque:a\",\"action\":\"approve\"}"),
        Arguments.of("reactivate", "{\"actorAccountId\":\"" + ID + "\",\"revision\":\"opaque:a\"}"),
        Arguments.of("report", "{\"reason\":\"Synthetic reason\"}"));
  }

  @ParameterizedTest
  @MethodSource("commands")
  @DisplayName("Binds complete generated commands and rejects unknown, absent and null fields")
  void bindsStrictCommands(String route, String body) throws Exception {
    // Given
    JsonNode fields = mapper.readTree(body);

    // When
    ResultActions valid =
        mvc.perform(
            post("/contract/" + route).contentType(MediaType.APPLICATION_JSON).content(body));

    // Then
    valid.andExpect(status().isOk());
    mvc.perform(
            post("/contract/" + route)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.replaceFirst("\\{", "{\"future\":true,")))
        .andExpect(status().isBadRequest());
    for (String field : fields.propertyNames()) {
      tools.jackson.databind.node.ObjectNode missing =
          (tools.jackson.databind.node.ObjectNode) mapper.readTree(body);
      missing.remove(field);
      mvc.perform(
              post("/contract/" + route)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(missing.toString()))
          .andExpect(status().isBadRequest());
      tools.jackson.databind.node.ObjectNode nulled =
          (tools.jackson.databind.node.ObjectNode) mapper.readTree(body);
      nulled.putNull(field);
      mvc.perform(
              post("/contract/" + route)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(nulled.toString()))
          .andExpect(status().isBadRequest());
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "0", "opaque:α/not-a-counter"})
  @DisplayName("Treats revisions as opaque nonempty strings")
  void bindsOpaqueRevision(String revision) throws Exception {
    // Given
    String body =
        mapper.writeValueAsString(
            new CreateStreamContributionRequest(
                revision, java.net.URI.create("https://twitch.tv/synthetic")));

    // When
    ResultActions result =
        mvc.perform(post("/contract/submit").contentType(MediaType.APPLICATION_JSON).content(body));

    // Then
    if (revision.isEmpty()) result.andExpect(status().isBadRequest());
    else result.andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(revision));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":1,\"action\":\"cancel\"}",
        "{\"revision\":\"a\",\"action\":\"unknown\"}"
      })
  @DisplayName("Refuses numeric revisions and unknown owner actions")
  void refusesInvalidCommandConcepts(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post("/contract/owner").contentType(MediaType.APPLICATION_JSON).content(body);

    // When
    ResultActions result = mvc.perform(request);

    // Then
    result.andExpect(status().isBadRequest());
  }

  /** Exposes real generated request DTOs without implementing any future business endpoint. */
  @RestController
  static class BindingAdapter {
    /**
     * Binds a complete ordinary proposal; generated validation owns field constraints.
     *
     * @param body generated command validated by MVC
     * @return unchanged bound command
     */
    @PostMapping("/contract/submit")
    CreateStreamContributionRequest submit(
        @Valid @RequestBody CreateStreamContributionRequest body) {
      return body;
    }

    /**
     * Binds a complete owner transition for one viewed version.
     *
     * @param body generated command validated by MVC
     * @return unchanged bound command
     */
    @PostMapping("/contract/owner")
    UpdateOwnStreamContributionRequest owner(
        @Valid @RequestBody UpdateOwnStreamContributionRequest body) {
      return body;
    }

    /**
     * Binds original actor, revision and address for direct publication.
     *
     * @param body generated command validated by MVC
     * @return unchanged bound command
     */
    @PostMapping("/contract/publish")
    CreateModeratedStreamContributionRequest publish(
        @Valid @RequestBody CreateModeratedStreamContributionRequest body) {
      return body;
    }

    /**
     * Binds an exact moderator decision without applying effects.
     *
     * @param body generated command validated by MVC
     * @return unchanged bound command
     */
    @PostMapping("/contract/moderate")
    UpdateModeratedStreamContributionRequest moderate(
        @Valid @RequestBody UpdateModeratedStreamContributionRequest body) {
      return body;
    }

    /**
     * Binds a historical source reactivation command without creating a version.
     *
     * @param body generated command validated by MVC
     * @return unchanged bound command
     */
    @PostMapping("/contract/reactivate")
    CreateStreamReactivationRequest reactivate(
        @Valid @RequestBody CreateStreamReactivationRequest body) {
      return body;
    }

    /**
     * Binds the report reason; business whitespace policy belongs to the later report use case.
     *
     * @param body generated command validated by MVC
     * @return unchanged bound command
     */
    @PostMapping("/contract/report")
    CreateStreamReportRequest report(@Valid @RequestBody CreateStreamReportRequest body) {
      return body;
    }
  }
}
