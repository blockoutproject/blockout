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

/** Isolates private-context binding and handwritten text normalization from provider effects. */
@WebMvcTest(controllers = SupportGeneratedWebMvcTest.BindingAdapter.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  SupportGeneratedWebMvcTest.BindingAdapter.class
})
@DisplayName("Support context and text binding")
class SupportGeneratedWebMvcTest {
  @Autowired private MockMvc mvc;
  @Autowired private BindingAdapter adapter;
  @Autowired private JsonMapper mapper;

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

  /** Records bound values only; complete receipt behavior uses the real support controller. */
  @RestController
  static class BindingAdapter implements SupportApi {
    private SubmitSupportRequest metadata;

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<SupportRequestCreatedResponse> createSupportRequest(
        SubmitSupportRequest metadata, Boolean bypass, List<MultipartFile> images) {
      this.metadata = metadata;
      return ResponseEntity.status(201)
          .body(
              new SupportRequestCreatedResponse(
                  UUID.fromString("00000000-0000-4000-8000-000000000001")));
    }
  }
}
