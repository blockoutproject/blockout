package com.blockout.backend.shared.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.ingestion.model.ObservationContextInternalRequest;
import com.blockout.backend.generated.mobile.api.AccountsApi;
import com.blockout.backend.generated.mobile.model.AccountPermissionsResponse;
import com.blockout.backend.generated.mobile.model.AccountResponse;
import com.blockout.backend.generated.mobile.model.ChangeAccountProfileRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.json.JsonMapper;

/**
 * Qualifies generated binding and error translation with test-only adapters. SecurityWebMvcTest
 * separately exercises the real authentication filters; this slice isolates HTTP serialization.
 */
@WebMvcTest(
    controllers = {
      ContractBoundaryWebMvcTest.BindingAdapter.class,
      ContractBoundaryWebMvcTest.AccountAdapter.class
    })
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(OutputCaptureExtension.class)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  ContractBoundaryWebMvcTest.BindingAdapter.class,
  ContractBoundaryWebMvcTest.AccountAdapter.class
})
@DisplayName("Canonical HTTP contract boundary")
class ContractBoundaryWebMvcTest {
  private static final String ACCOUNT = "/accounts/00000000-0000-4000-8000-000000000001";
  @Autowired private MockMvc mvc;
  @Autowired private JsonMapper mapper;

  @ParameterizedTest
  @ValueSource(strings = {"bad-date", "2026-02-31T12:00:00Z"})
  @DisplayName("Rejects invalid dates at the generated ingestion boundary")
  void rejectsInvalidDate(String date) throws Exception {
    // Given
    String body =
        """
        {"cycleId":"00000000-0000-4000-8000-000000000001","readOrdinal":1,"observedAt":"%s"}
        """
            .formatted(date);

    // When
    ResultActions response =
        mvc.perform(
            post("/contract/observation").contentType(MediaType.APPLICATION_JSON).content(body));

    // Then
    response.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"{\"photoAction\":\"future\"}", "{\"username\":null}", "{\"future\":true}"})
  @DisplayName("Rejects invalid multipart metadata using the generated interface")
  void rejectsMultipartMetadata(String metadata) throws Exception {
    // Given
    MockMultipartFile part =
        new MockMultipartFile(
            "metadata", "", "application/json", metadata.getBytes(StandardCharsets.UTF_8));

    // When
    ResultActions response = mvc.perform(multipart(HttpMethod.PATCH, ACCOUNT).file(part));

    // Then
    response.andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Accepts multipart metadata with the advertised patch and cache headers")
  void acceptsMultipart() throws Exception {
    // Given
    MockMultipartFile metadata =
        new MockMultipartFile(
            "metadata",
            "",
            "application/json",
            "{\"username\":\"Ada\"}".getBytes(StandardCharsets.UTF_8));
    MockMultipartFile image =
        new MockMultipartFile("image", "photo.png", "image/png", new byte[] {1, 2});

    // When
    ResultActions response =
        mvc.perform(multipart(HttpMethod.PATCH, ACCOUNT).file(metadata).file(image));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Accept-Patch", "multipart/form-data"))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Returns safe Problem Details for unsupported media")
  void rejectsUnsupportedMedia() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post("/contract/observation").contentType(MediaType.TEXT_PLAIN).content("private payload");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isUnsupportedMediaType())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unsupported-media-type"))
        .andExpect(content().string(not(containsString("private payload"))));
  }

  @Test
  @DisplayName("Keeps intentional 204 responses empty")
  void preservesNoContent() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = delete(ACCOUNT);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isNoContent()).andExpect(content().string(""));
  }

  @Test
  @DisplayName("Preserves a created resource location")
  void preservesLocation() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = post("/accounts");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isCreated()).andExpect(header().string("Location", ACCOUNT));
  }

  @Test
  @DisplayName("Keeps unexpected failures free of internal details")
  void sanitizesUnexpectedFailure(CapturedOutput output) throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get("/accounts/me");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.instance").doesNotExist())
        .andExpect(content().string(not(containsString("private"))));
    assertThat(output.getOut())
        .contains(
            "\"operation\":\"http_request\"",
            "\"outcome\":\"failed\"",
            "\"type\":\"java.lang.IllegalStateException\"")
        .doesNotContain("private provider payload");
  }

  @Test
  @DisplayName("Serializes and decodes valid additive root and nested response fields")
  void acceptsAdditiveResponse() throws Exception {
    // Given
    MockHttpServletRequestBuilder request = get(ACCOUNT);

    // When
    MvcResult result = mvc.perform(request).andReturn();
    AccountResponse response =
        mapper.readValue(result.getResponse().getContentAsString(), AccountResponse.class);

    // Then
    assertThat(result.getResponse().getStatus()).isEqualTo(200);
    assertThat(response.getUsername()).isEqualTo("Ada");
    assertThat(response.getPrincipalCreatedAt().isPresent()).isTrue();
    assertThat(response.getPrincipalCreatedAt().get()).isNull();
    assertThat(response.getAdditionalProperties()).containsEntry("future", true);
    assertThat(response.getPermissions().getAdditionalProperties()).containsEntry("future", true);
  }

  /**
   * Test-only endpoints exercise canonical DTO binding without implementing any business use case.
   */
  @RestController
  static class BindingAdapter {
    /**
     * Exercises the same generated date binding used by ingestion requests.
     *
     * @param body canonical observation context
     * @return the unchanged bound context
     */
    @PostMapping(value = "/contract/observation", consumes = "application/json")
    ObservationContextInternalRequest observation(
        @Valid @RequestBody ObservationContextInternalRequest body) {
      return body;
    }
  }

  /** Supplies real generated HTTP mappings, with no database or account semantics. */
  @RestController
  static class AccountAdapter implements AccountsApi {
    /** {@inheritDoc} */
    @Override
    public ResponseEntity<AccountResponse> changeAccountProfile(
        UUID accountId, ChangeAccountProfileRequest metadata, Boolean bypass, MultipartFile image) {
      return ResponseEntity.ok()
          .header("Accept-Patch", "multipart/form-data")
          .header("Cache-Control", "no-store")
          .body(account());
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Void> eraseAccount(UUID accountId, Boolean bypass) {
      return ResponseEntity.noContent().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<AccountResponse> establishAccount(Boolean bypass) {
      return ResponseEntity.created(URI.create(ACCOUNT)).body(account());
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<AccountResponse> getAccount(UUID accountId, Boolean bypass) {
      return ResponseEntity.ok(account());
    }

    /** Builds a complete harmless owner profile, including permitted additive properties. */
    private static AccountResponse account() {
      return new AccountResponse()
          .accountId(UUID.fromString("00000000-0000-4000-8000-000000000001"))
          .username("Ada")
          .email("fixture@example.invalid")
          .principalCreatedAt(null)
          .hasPhoto(false)
          .permissions(new AccountPermissionsResponse().putAdditionalProperty("future", true))
          .putAdditionalProperty("future", true);
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Resource> getAccountPhoto(UUID accountId, Boolean bypass) {
      return ResponseEntity.notFound().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<AccountResponse> getMyAccount() {
      throw new IllegalStateException("private provider payload");
    }
  }
}
