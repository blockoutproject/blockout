package com.blockout.backend.support.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.api.SupportApi;
import com.blockout.backend.generated.mobile.model.SubmitSupportRequest;
import com.blockout.backend.generated.mobile.model.SupportRequestCreatedResponse;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Tests the generated JSON-part binding without activating a provider or support route. */
@WebMvcTest(controllers = SupportGeneratedWebMvcTest.BindingAdapter.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  SupportGeneratedWebMvcTest.BindingAdapter.class
})
@DisplayName("Generated support multipart boundary")
class SupportGeneratedWebMvcTest {
  @Autowired private MockMvc mvc;
  @Autowired private BindingAdapter adapter;
  @Autowired private JsonMapper mapper;

  @Test
  @DisplayName("Binds Unicode JSON metadata and repeated image parts")
  void bindsMultipart() throws Exception {
    // Given
    byte[] metadata = new ClassPathResource("support/metadata.json").getContentAsByteArray();
    MockMultipartFile png =
        new MockMultipartFile(
            "images",
            "first.png",
            "image/png",
            new ClassPathResource("support/synthetic.png").getContentAsByteArray());
    MockMultipartFile jpeg =
        new MockMultipartFile(
            "images",
            "second.jpg",
            "image/jpeg",
            new ClassPathResource("support/synthetic.jpg").getContentAsByteArray());

    // When
    ResultActions response =
        mvc.perform(
            multipart("/support-requests")
                .file(
                    new MockMultipartFile(
                        "metadata", "metadata.json", "application/json", metadata))
                .file(png)
                .file(jpeg));

    // Then
    response.andExpect(status().isCreated());
    assertThat(adapter.metadata.getTitle()).isEqualTo("Écran de démonstration 🏐");
    assertThat(adapter.metadata.getSubject()).isNull();
    assertThat(adapter.images)
        .extracting(MultipartFile::getContentType)
        .containsExactly("image/png", "image/jpeg");
  }

  @Test
  @DisplayName("Rejects an undeclared context field before the adapter")
  void rejectsUnknownContext() throws Exception {
    // Given
    String metadata =
        """
        {"kind":"problem","title":"x","description":"x","replyEmail":"fiction@example.invalid","context":{"rawLog":"excluded"}}
        """;

    // When
    ResultActions response =
        mvc.perform(
            multipart("/support-requests")
                .file(
                    new MockMultipartFile(
                        "metadata",
                        "",
                        "application/json",
                        metadata.getBytes(StandardCharsets.UTF_8))));

    // Then
    response.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(strings = {"kind", "title", "description", "replyEmail", "context"})
  @DisplayName("Rejects each omitted required metadata field")
  void rejectsMissingRequiredField(String field) throws Exception {
    // Given
    ObjectNode metadata = validMetadata();
    metadata.remove(field);

    // When
    ResultActions response = mvc.perform(request(metadata));

    // Then
    response.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(strings = {"title", "description", "replyEmail"})
  @DisplayName("Rejects empty required text")
  void rejectsEmptyField(String field) throws Exception {
    // Given
    ObjectNode metadata = validMetadata().put(field, "");

    // When
    ResultActions response = mvc.perform(request(metadata));

    // Then
    response.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(strings = {"title", "description"})
  @DisplayName("Rejects whitespace-only required text")
  void rejectsBlankField(String field) throws Exception {
    // Given
    ObjectNode metadata = validMetadata().put(field, " \t\n ");

    // When
    ResultActions response = mvc.perform(request(metadata));

    // Then
    response.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(strings = {"title", "description"})
  @DisplayName("Rejects Unicode whitespace-only required text")
  void rejectsUnicodeBlankField(String field) throws Exception {
    // Given
    ObjectNode metadata = validMetadata().put(field, "\u2003\u00a0\ufeff");

    // When
    ResultActions response = mvc.perform(request(metadata));

    // Then
    response.andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Trims title and reply address before canonical validation")
  void normalizesBeforeValidation() throws Exception {
    // Given
    ObjectNode metadata =
        validMetadata()
            .put("title", " \u2003\u00a0" + "é".repeat(200) + "\ufeff ")
            .put("replyEmail", " \u2003fiction@example.invalid\u00a0 ");

    // When
    ResultActions response = mvc.perform(request(metadata));

    // Then
    response.andExpect(status().isCreated());
    assertThat(adapter.metadata.getTitle()).isEqualTo("é".repeat(200));
    assertThat(adapter.metadata.getReplyEmail()).isEqualTo("fiction@example.invalid");
  }

  @ParameterizedTest
  @ValueSource(strings = {"title", "description"})
  @DisplayName("Accepts exact text bounds and rejects the next character")
  void enforcesTextBounds(String field) throws Exception {
    // Given
    int maximum = field.equals("title") ? 200 : 10_000;
    ObjectNode metadata = validMetadata().put(field, "é".repeat(maximum));

    // When
    ResultActions exact = mvc.perform(request(metadata));
    ResultActions excessive = mvc.perform(request(metadata.put(field, "é".repeat(maximum + 1))));

    // Then
    exact.andExpect(status().isCreated());
    excessive.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(strings = {"title", "description", "screen"})
  @DisplayName("Counts supplementary characters as two units at the approved UTF-16 boundary")
  void enforcesUtf16Bounds(String field) throws Exception {
    // Given
    int maximum =
        switch (field) {
          case "title" -> 200;
          case "description" -> 10_000;
          default -> 256;
        };
    ObjectNode metadata = validMetadata();
    ObjectNode owner = field.equals("screen") ? metadata.withObject("/context") : metadata;
    String value = "🏐".repeat(maximum / 2);
    owner.put(field, value);

    // When
    ResultActions exact = mvc.perform(request(metadata));
    owner.put(field, value + "x");
    ResultActions excessive = mvc.perform(request(metadata));

    // Then
    exact.andExpect(status().isCreated());
    excessive.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "screen",
        "action",
        "appVersion",
        "osVersion",
        "deviceModel",
        "method",
        "stage",
        "reason",
        "reference"
      })
  @DisplayName("Enforces every contextual string's exact and excessive length")
  void enforcesContextBounds(String field) throws Exception {
    // Given
    ObjectNode metadata = validMetadata();
    ObjectNode context = metadata.withObject("/context");
    ObjectNode owner =
        List.of("method", "stage", "reason", "reference").contains(field)
            ? context.putObject("signInFailure")
            : context;
    owner.put(field, "é".repeat(256));

    // When
    ResultActions exact = mvc.perform(request(metadata));
    owner.put(field, "é".repeat(257));
    ResultActions excessive = mvc.perform(request(metadata));
    owner.put(field, "");
    ResultActions empty = mvc.perform(request(metadata));

    // Then
    exact.andExpect(status().isCreated());
    excessive.andExpect(status().isBadRequest());
    empty.andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Enforces reply-email syntax and its 254 character boundary")
  void enforcesEmail() throws Exception {
    // Given
    String email =
        "a".repeat(64) + "@" + "b".repeat(63) + "." + "c".repeat(63) + "." + "d".repeat(61);
    ObjectNode metadata = validMetadata().put("replyEmail", email);

    // When
    ResultActions exact = mvc.perform(request(metadata));
    ResultActions excessive = mvc.perform(request(metadata.put("replyEmail", email + "d")));
    ResultActions malformed =
        mvc.perform(request(metadata.put("replyEmail", "missing-at.example.invalid")));

    // Then
    assertThat(email).hasSize(254);
    exact.andExpect(status().isCreated());
    excessive.andExpect(status().isBadRequest());
    malformed.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"kind\":\"unknown\"}",
        "{\"kind\":null}",
        "{\"title\":null}",
        "{\"title\":42}",
        "{\"title\":1.5}",
        "{\"title\":true}",
        "{\"description\":42}",
        "{\"context\":{\"screen\":42}}",
        "{\"replyEmail\":true}",
        "{\"subject\":null}",
        "{\"subject\":\"\"}",
        "{\"subject\":\"unknown\"}",
        "{\"context\":null}",
        "{\"context\":{\"platform\":\"web\"}}",
        "{\"context\":{\"accountId\":\"invalid\"}}",
        "{\"context\":{\"target\":{\"type\":\"invalid\",\"id\":\"00000000-0000-4000-8000-000000000001\"}}}",
        "{\"context\":{\"target\":{\"type\":\"match\",\"id\":\"invalid\"}}}",
        "{\"context\":{\"target\":{}}}",
        "{\"context\":{\"signInFailure\":{\"token\":\"excluded\"}}}"
      })
  @DisplayName("Rejects forbidden null, enum, UUID and nested property values")
  void rejectsInvalidCanonicalShape(String override) throws Exception {
    // Given
    ObjectNode metadata = validMetadata();
    metadata.setAll((ObjectNode) mapper.readTree(override));

    // When
    ResultActions response = mvc.perform(request(metadata));

    // Then
    response.andExpect(status().isBadRequest());
  }

  /** Reads only the synthetic canonical fixture, retaining explicit scenario overrides. */
  private ObjectNode validMetadata() throws Exception {
    return (ObjectNode)
        mapper.readTree(new ClassPathResource("support/metadata.json").getContentAsByteArray());
  }

  /**
   * Builds a JSON part for the generated boundary with scenario-owned metadata.
   *
   * @param metadata scenario-owned canonical JSON object
   * @return ordinary JSON metadata part without hand-encoding multipart bytes
   */
  private MockMultipartHttpServletRequestBuilder request(ObjectNode metadata) {
    return multipart("/support-requests")
        .file(
            new MockMultipartFile(
                "metadata",
                "metadata.json",
                "application/json",
                mapper.writeValueAsBytes(metadata)));
  }

  /** Records bound values only; this is not the future complete-send controller. */
  @RestController
  static class BindingAdapter implements SupportApi {
    private SubmitSupportRequest metadata;
    private List<MultipartFile> images;

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<SupportRequestCreatedResponse> createSupportRequest(
        SubmitSupportRequest metadata, Boolean bypass, List<MultipartFile> images) {
      this.metadata = metadata;
      this.images = images;
      return ResponseEntity.status(201)
          .body(
              new SupportRequestCreatedResponse(
                  UUID.fromString("00000000-0000-4000-8000-000000000001")));
    }
  }
}
