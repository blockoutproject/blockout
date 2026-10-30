package com.blockout.backend.support.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.support.application.CreateSupportRequest;
import com.blockout.backend.support.application.SupportAttachments;
import com.blockout.backend.support.application.SupportCases;
import com.blockout.backend.support.application.SupportSignal;
import com.blockout.backend.support.application.SupportUnavailableException;
import com.blockout.backend.support.infrastructure.SupportConfiguration;
import com.blockout.backend.support.infrastructure.SupportDiagnostics;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import tools.jackson.databind.json.JsonMapper;

/**
 * Actual generated controller, canonical validation and use case; provider I/O alone is replaced.
 */
@WebMvcTest(SupportController.class)
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  ApiExceptionHandler.class,
  SupportInputMapperImpl.class,
  SupportApiMapperImpl.class,
  CreateSupportRequest.class,
  SupportConfiguration.class,
  SupportDiagnostics.class
})
@DisplayName("Complete support HTTP contract")
class SupportContractTest {
  @Autowired private MockMvc mvc;
  @Autowired private JsonMapper json;
  @MockitoBean private SupportCases cases;
  @MockitoBean private SupportAttachments attachments;
  @MockitoBean private SupportSignal signal;
  @MockitoBean private MaintenanceAdmission admission;

  @ParameterizedTest
  @ValueSource(ints = {0, 2, 5})
  @DisplayName("Returns only an opaque non-cacheable complete receipt for all repeated parts")
  void acceptsCompleteMultipart(int imageCount) throws Exception {
    // Given
    when(cases.create(any())).thenReturn(17L);
    MockMultipartHttpServletRequestBuilder request = request();
    for (int index = 0; index < imageCount; index++) {
      String extension = index % 2 == 0 ? "png" : "jpg";
      request.file(
          new MockMultipartFile(
              "images",
              "user-name-" + index,
              "application/octet-stream",
              new ClassPathResource("support/synthetic." + extension).getContentAsByteArray()));
    }

    // When
    MvcResult result =
        mvc.perform(request)
            // Then
            .andExpect(status().isCreated())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(header().doesNotExist("Location"))
            .andReturn();
    assertThat(json.readTree(result.getResponse().getContentAsString()).properties()).hasSize(1);
    assertThat(
            UUID.fromString(
                json.readTree(result.getResponse().getContentAsString()).get("requestId").asText()))
        .isNotNull();
  }

  @Test
  @DisplayName("Refuses a missing metadata part before provider effects")
  void requiresMetadata() throws Exception {
    // Given / When
    mvc.perform(multipart("/support-requests"))
        // Then
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
    verifyNoInteractions(cases, attachments, signal);
  }

  @ParameterizedTest
  @CsvSource({
    "oversize,413,payload-too-large",
    "gif,415,unsupported-media-type",
    "corrupt,422,unprocessable-content",
    "count,400,invalid-request"
  })
  @DisplayName("Translates whole-input file refusals before provider effects")
  void refusesInvalidFiles(String input, int status, String problem) throws Exception {
    // Given
    byte[] bytes =
        switch (input) {
          case "oversize" -> new byte[5_242_881];
          case "gif" -> new ClassPathResource("support/synthetic.gif").getContentAsByteArray();
          case "count" -> new ClassPathResource("support/synthetic.png").getContentAsByteArray();
          default -> new byte[] {1, 2, 3};
        };
    MockMultipartHttpServletRequestBuilder request = request();
    for (int index = 0; index < (input.equals("count") ? 6 : 1); index++) {
      request.file(new MockMultipartFile("images", "private-name.png", "image/png", bytes));
    }

    // When
    mvc.perform(request)
        // Then
        .andExpect(status().is(status))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:" + problem));
    verifyNoInteractions(cases, attachments, signal);
  }

  @Test
  @DisplayName("Does not confirm a failed attachment after intermediate creation")
  void refusesPartialReceipt() throws Exception {
    // Given
    when(cases.create(any())).thenReturn(17L);
    doThrow(
            new SupportUnavailableException(
                SupportUnavailableException.Stage.ATTACH,
                SupportUnavailableException.Reason.PROCESS_FAILED))
        .when(attachments)
        .attach(org.mockito.ArgumentMatchers.anyLong(), any());

    // When
    mvc.perform(
            request()
                .file(
                    new MockMultipartFile(
                        "images",
                        "private.png",
                        "image/png",
                        new ClassPathResource("support/synthetic.png").getContentAsByteArray())))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(header().doesNotExist("Location"));
    verifyNoInteractions(signal);
  }

  @Test
  @DisplayName("Supplied invalid authentication retains the native 401 refusal")
  void refusesInvalidAuthentication() throws Exception {
    // Given / When
    mvc.perform(request().header("Authorization", "Bearer invalid"))
        // Then
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unauthenticated"));
    verifyNoInteractions(cases, attachments, signal);
  }

  @Test
  @DisplayName("Explicit denied bypass retains the native 403 refusal")
  void refusesForbiddenBypass() throws Exception {
    // Given
    doThrow(new AccessDeniedException("Action is not permitted"))
        .when(admission)
        .requireOrdinaryAccess(nullable(String.class), nullable(String.class), anyBoolean());

    // When
    mvc.perform(
            request()
                .with(
                    org.springframework.security.test.web.servlet.request
                        .SecurityMockMvcRequestPostProcessors.jwt())
                .header("Blockout-Maintenance-Bypass", "true"))
        // Then
        .andExpect(status().isForbidden());
    verifyNoInteractions(cases, attachments, signal);
  }

  /** Uses the canonical fictional metadata as a native JSON part. */
  private static MockMultipartHttpServletRequestBuilder request() throws Exception {
    return multipart("/support-requests")
        .file(
            new MockMultipartFile(
                "metadata",
                "",
                "application/json",
                new ClassPathResource("support/metadata.json").getContentAsByteArray()));
  }
}
