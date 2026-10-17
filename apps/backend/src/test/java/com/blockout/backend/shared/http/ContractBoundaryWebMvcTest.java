package com.blockout.backend.shared.http;

import static org.assertj.core.api.Assertions.assertThat;
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
import com.blockout.backend.generated.mobile.model.ChangeAccountProfileRequestMetadata;
import com.blockout.backend.generated.mobile.model.ChangeApplicationVersionsRequest;
import com.blockout.backend.generated.mobile.model.EstablishAccount200Response;
import com.blockout.backend.generated.mobile.model.EstablishAccount200ResponsePermissions;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.json.JsonMapper;

/** Qualifies generated models and interface mappings with adapters confined to test sources. */
@WebMvcTest
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
  @ValueSource(
      strings = {
        "{}",
        "{\"revision\":null}",
        "{\"revision\":-1}",
        "{\"revision\":\"0\"}",
        "{\"revision\":0.4}",
        "{\"revision\":0,\"future\":true}",
        "{\"revision\":0,\"ios\":{\"future\":true}}",
        "{\"revision\":0,\"ios\":null}",
        "{\"revision\":0,\"message\":\"\"}"
      })
  @DisplayName("Rejects missing, invalid and unknown properties through HTTP binding")
  void rejectsInvalidInput(String body) throws Exception {
    // Given / When
    mvc.perform(post("/contract/versions").contentType(MediaType.APPLICATION_JSON).content(body))
        // Then
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Preserves an omitted nullable field as absent")
  void preservesOmission() throws Exception {
    // Given / When
    mvc.perform(
            post("/contract/versions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":0}"))
        // Then
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").doesNotHaveJsonPath());
  }

  @Test
  @DisplayName("Preserves explicit null for nullable fields")
  void preservesExplicitNull() throws Exception {
    // Given / When
    mvc.perform(
            post("/contract/versions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":0,\"message\":null}"))
        // Then
        .andExpect(status().isOk())
        .andExpect(content().json("{\"revision\":0,\"message\":null}"));
  }

  @ParameterizedTest
  @ValueSource(strings = {"bad-date", "2026-02-31T12:00:00Z"})
  @DisplayName("Rejects invalid dates at the generated ingestion boundary")
  void rejectsInvalidDate(String date) throws Exception {
    // Given
    String body =
        "{\"cycleId\":\"00000000-0000-4000-8000-000000000001\",\"readOrdinal\":1,\"observedAt\":\""
            + date
            + "\"}";

    // When / Then
    mvc.perform(post("/contract/observation").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"{\"photoAction\":\"future\"}", "{\"username\":null}", "{\"future\":true}"})
  @DisplayName("Rejects invalid multipart metadata using the generated interface")
  void rejectsMultipartMetadata(String metadata) throws Exception {
    // Given
    MockMultipartFile part =
        new MockMultipartFile(
            "metadata",
            "",
            "application/json",
            metadata.getBytes(java.nio.charset.StandardCharsets.UTF_8));

    // When / Then
    mvc.perform(multipart(HttpMethod.PATCH, ACCOUNT).file(part)).andExpect(status().isBadRequest());
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
            "{\"username\":\"Ada\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
    MockMultipartFile image =
        new MockMultipartFile("image", "photo.png", "image/png", new byte[] {1, 2});

    // When / Then
    mvc.perform(multipart(HttpMethod.PATCH, ACCOUNT).file(metadata).file(image))
        .andExpect(status().isOk())
        .andExpect(header().string("Accept-Patch", "multipart/form-data"))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @DisplayName("Returns safe Problem Details for unsupported media")
  void rejectsUnsupportedMedia() throws Exception {
    // Given / When
    mvc.perform(
            post("/contract/versions").contentType(MediaType.TEXT_PLAIN).content("private payload"))
        // Then
        .andExpect(status().isUnsupportedMediaType())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unsupported-media-type"))
        .andExpect(
            content()
                .string(
                    org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("private payload"))));
  }

  @Test
  @DisplayName("Keeps intentional 204 responses empty")
  void preservesNoContent() throws Exception {
    // Given / When / Then
    mvc.perform(delete(ACCOUNT)).andExpect(status().isNoContent()).andExpect(content().string(""));
  }

  @Test
  @DisplayName("Preserves a created resource location")
  void preservesLocation() throws Exception {
    // Given / When / Then
    mvc.perform(post("/accounts"))
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", ACCOUNT));
  }

  @Test
  @DisplayName("Keeps unexpected failures free of internal details")
  void sanitizesUnexpectedFailure() throws Exception {
    // Given / When / Then
    mvc.perform(get("/accounts/me"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.instance").doesNotExist())
        .andExpect(
            content()
                .string(
                    org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private"))));
  }

  @Test
  @DisplayName("Serializes and decodes valid additive root and nested response fields")
  void acceptsAdditiveResponse() throws Exception {
    // Given / When
    String json =
        mvc.perform(get(ACCOUNT))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    EstablishAccount200Response response =
        mapper.readValue(json, EstablishAccount200Response.class);

    // Then
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
     * Returns the bound DTO so the test can observe absent and null transport values.
     *
     * @param body canonical partial version update
     * @return the unchanged bound transport value
     */
    @PostMapping(value = "/contract/versions", consumes = "application/json")
    ChangeApplicationVersionsRequest versions(
        @Valid @RequestBody ChangeApplicationVersionsRequest body) {
      return body;
    }

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
    public ResponseEntity<EstablishAccount200Response> changeAccountProfile(
        UUID accountId,
        ChangeAccountProfileRequestMetadata metadata,
        Boolean bypass,
        MultipartFile image) {
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
    public ResponseEntity<EstablishAccount200Response> establishAccount(Boolean bypass) {
      return ResponseEntity.created(URI.create(ACCOUNT)).body(account());
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<EstablishAccount200Response> getAccount(UUID accountId, Boolean bypass) {
      return ResponseEntity.ok(account());
    }

    /** Builds a complete harmless owner profile, including permitted additive properties. */
    private static EstablishAccount200Response account() {
      return new EstablishAccount200Response()
          .accountId(UUID.fromString("00000000-0000-4000-8000-000000000001"))
          .username("Ada")
          .email("fixture@example.invalid")
          .principalCreatedAt(null)
          .hasPhoto(false)
          .permissions(
              new EstablishAccount200ResponsePermissions().putAdditionalProperty("future", true))
          .putAdditionalProperty("future", true);
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<Resource> getAccountPhoto(UUID accountId, Boolean bypass) {
      return ResponseEntity.notFound().build();
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<EstablishAccount200Response> getMyAccount() {
      throw new IllegalStateException("private provider payload");
    }
  }
}
