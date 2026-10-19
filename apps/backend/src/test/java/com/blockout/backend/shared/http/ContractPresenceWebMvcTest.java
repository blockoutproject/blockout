package com.blockout.backend.shared.http;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.CreateDivisionRequest;
import com.blockout.backend.generated.mobile.model.SetClassificationRequest;
import com.blockout.backend.generated.mobile.model.SetPoolPresentationRequest;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;

/**
 * Qualifies required nullable scalars, objects and multipart collections through native binding.
 */
@WebMvcTest(controllers = ContractPresenceWebMvcTest.BindingAdapter.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  ContractPresenceWebMvcTest.BindingAdapter.class
})
@DisplayName("Required nullable HTTP properties")
class ContractPresenceWebMvcTest {
  @Autowired private MockMvc mvc;

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":\"r1\"}",
        "{\"revision\":\"r1\",\"manualName\":null}",
        "{\"revision\":\"r1\",\"manualShortName\":null}"
      })
  @DisplayName("Rejects omitted required names instead of interpreting them as removal")
  void rejectsOmittedRequiredNames(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post("/contract/presentation").contentType(MediaType.APPLICATION_JSON).content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":\"r1\",\"manualName\":null,\"manualShortName\":null}",
        "{\"revision\":\"r1\",\"manualName\":\"Synthetic pool\",\"manualShortName\":\"Pool A\"}"
      })
  @DisplayName("Preserves explicitly supplied null or value names")
  void preservesRequiredNames(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post("/contract/presentation").contentType(MediaType.APPLICATION_JSON).content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isOk()).andExpect(content().json(body));
  }

  @Test
  @DisplayName("Rejects an omitted required classification instead of removing it")
  void rejectsOmittedRequiredObject() throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post("/contract/classification")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"revision\":\"r1\"}");

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":\"r1\",\"classification\":null}",
        "{\"revision\":\"r1\",\"classification\":{\"divisionId\":\"00000000-0000-4000-8000-000000000001\",\"format\":\"6x6\",\"gender\":\"mixed\"}}"
      })
  @DisplayName("Preserves an explicitly supplied null or value classification")
  void preservesRequiredObject(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post("/contract/classification").contentType(MediaType.APPLICATION_JSON).content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isOk()).andExpect(content().json(body));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"name\":\"Synthetic division\",\"color\":\"#112233\",\"logoAction\":\"keep\"}",
        "{\"name\":\"Synthetic division\",\"color\":\"#112233\",\"gradient\":[],\"logoAction\":\"keep\"}",
        "{\"name\":\"Synthetic division\",\"color\":\"#112233\",\"gradient\":[null,\"#445566\",\"#778899\"],\"logoAction\":\"keep\"}",
        "{\"name\":\"Synthetic division\",\"color\":\"blue\",\"gradient\":null,\"logoAction\":\"keep\"}",
        "{\"name\":\"Synthetic division\",\"color\":null,\"gradient\":null,\"logoAction\":\"keep\"}",
        "{\"name\":\"Synthetic division\",\"color\":\"#112233\",\"gradient\":[\"#112233\",\"#445566\",\"#778899\",\"#AABBCC\"],\"logoAction\":\"keep\"}",
        "{\"name\":\"Synthetic division\",\"color\":\"#112233\",\"gradient\":[\"#112233\",\"blue\",\"#778899\"],\"logoAction\":\"keep\"}"
      })
  @DisplayName("Rejects missing or invalid division colors and gradients through native validation")
  void rejectsInvalidDivisionColors(String body) throws Exception {
    // Given
    MockMultipartFile metadata =
        new MockMultipartFile(
            "metadata", "", "application/json", body.getBytes(StandardCharsets.UTF_8));

    // When
    ResultActions response = mvc.perform(multipart("/contract/division").file(metadata));

    // Then
    response.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"name\":\"Synthetic division\",\"color\":\"#112233\",\"gradient\":null,\"logoAction\":\"keep\"}",
        "{\"name\":\"Synthetic division\",\"color\":\"#112233\",\"gradient\":[\"#112233\",\"#445566\",\"#778899\"],\"logoAction\":\"keep\"}"
      })
  @DisplayName("Preserves explicit null or supplied gradients in multipart metadata")
  void preservesMultipartCollection(String body) throws Exception {
    // Given
    MockMultipartFile metadata =
        new MockMultipartFile(
            "metadata", "", "application/json", body.getBytes(StandardCharsets.UTF_8));

    // When
    ResultActions response = mvc.perform(multipart("/contract/division").file(metadata));

    // Then
    response.andExpect(status().isOk()).andExpect(content().json(body));
  }

  /** Echoes canonical DTOs only under test routes; no business mutation is implemented. */
  @RestController
  static class BindingAdapter {
    /**
     * Exposes required nullable scalar binding without applying presentation changes.
     *
     * @param body generated complete replacement request
     * @return the unchanged bound request
     */
    @PostMapping("/contract/presentation")
    SetPoolPresentationRequest presentation(@RequestBody @Valid SetPoolPresentationRequest body) {
      return body;
    }

    /**
     * Exposes required nullable object binding without applying a classification.
     *
     * @param body generated scoped classification request
     * @return the unchanged bound request
     */
    @PostMapping("/contract/classification")
    SetClassificationRequest classification(@RequestBody @Valid SetClassificationRequest body) {
      return body;
    }

    /**
     * Uses the native JSON part converter for required nullable collection binding.
     *
     * @param metadata generated division metadata, without creating a division
     * @return the unchanged bound metadata
     */
    @PostMapping(value = "/contract/division", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    CreateDivisionRequest division(@RequestPart("metadata") @Valid CreateDivisionRequest metadata) {
      return metadata;
    }
  }
}
