package com.blockout.backend.access.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.access.domain.MaintenanceRequiredException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real security/mapping boundary; the current SQL decision is isolated in the integration suite.
 */
@WebMvcTest(controllers = MaintenanceAdmissionWebMvcTest.Probe.class)
@Import({
  SecurityConfiguration.class,
  ApiExceptionHandler.class,
  MaintenanceAdmissionWebMvcTest.Probe.class
})
@DisplayName("Shared maintenance method and resource admission")
class MaintenanceAdmissionWebMvcTest {
  @Autowired private MockMvc mvc;
  @MockitoBean private MaintenanceAdmission admission;

  @ParameterizedTest
  @CsvSource({
    "GET,/clubs",
    "POST,/support-requests",
    "GET,/administration/unknown",
    "GET,/administration/stream-moderation",
    "GET,/accounts/me/photo",
    "POST,/application-access",
    "HEAD,/application-access",
    "POST,/api/v1/mobile/public/config/app-status",
    "PATCH,/accounts/me",
    "POST,/administration/maintenance/activation",
    "DELETE,/administration/collection-controls/control"
  })
  @DisplayName(
      "Refuses ordinary direct calls including unsupported methods and unknown administration")
  void refusesOrdinary(String method, String path) throws Exception {
    // Given
    doThrow(
            new MaintenanceRequiredException(
                new MaintenanceSettings(7, true, "Pause en cours", null)))
        .when(admission)
        .requireOrdinaryAccess(nullable(String.class), nullable(String.class), anyBoolean());

    // When
    mvc.perform(
            request(HttpMethod.valueOf(method), path)
                .with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"))
        .andExpect(jsonPath("$.maintenance.revision").value(7))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(header().doesNotExist("Retry-After"));
  }

  @ParameterizedTest
  @CsvSource({
    "GET,/application-access",
    "GET,/accounts/me",
    "GET,/legals/privacy",
    "GET,/legals/terms",
    "GET,/legals/imprint",
    "GET,/administration/maintenance",
    "PATCH,/administration/maintenance",
    "PUT,/administration/maintenance/activation",
    "GET,/administration/application-versions",
    "PATCH,/administration/application-versions",
    "POST,/administration/collection-controls/control/requests",
    "GET,/administration/collection-controls/control/results",
    "PUT,/administration/pools/pool/classification"
  })
  @DisplayName("Leaves exact exceptions to authentication and their owning action authorization")
  void preservesExactException(String method, String path) throws Exception {
    // Given / When
    mvc.perform(
            request(HttpMethod.valueOf(method), path)
                .with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
        // Then
        .andExpect(status().isOk());
    verifyNoInteractions(admission);
  }

  @ParameterizedTest
  @ValueSource(strings = {"1", "yes", "TRUE", " true", "", "true,false"})
  @DisplayName("Rejects noncanonical bypass values before ordinary work")
  void rejectsInvalidHeader(String value) throws Exception {
    // Given / When
    mvc.perform(request(HttpMethod.GET, "/clubs").header("Blockout-Maintenance-Bypass", value))
        // Then
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
    verifyNoInteractions(admission);
  }

  @Test
  @DisplayName("Rejects repeated bypass values")
  void rejectsRepeatedHeader() throws Exception {
    // Given / When
    mvc.perform(
            request(HttpMethod.GET, "/clubs").header("Blockout-Maintenance-Bypass", "true", "true"))
        // Then
        .andExpect(status().isBadRequest());
    verifyNoInteractions(admission);
  }

  @Test
  @DisplayName("Keeps failed admission configuration generic and non-cacheable")
  void keepsUnavailableGeneric() throws Exception {
    // Given
    doThrow(new AccountUnavailableException())
        .when(admission)
        .requireOrdinaryAccess(any(), any(), anyBoolean());

    // When
    mvc.perform(
            request(HttpMethod.GET, "/clubs")
                .with(jwt().jwt(token -> token.claim("azp", "mobile-test"))))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.maintenance").doesNotExist())
        .andExpect(header().doesNotExist("Retry-After"));
  }

  @Test
  @DisplayName("Does not manufacture active maintenance from an inconsistent refusal")
  void rejectsInactiveRefusal() throws Exception {
    // Given
    doThrow(new MaintenanceRequiredException(new MaintenanceSettings(7, false, "Prepared", null)))
        .when(admission)
        .requireOrdinaryAccess(nullable(String.class), nullable(String.class), anyBoolean());

    // When
    mvc.perform(request(HttpMethod.GET, "/clubs"))
        // Then
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.maintenance").doesNotExist());
  }

  /** Test-owned effects expose only whether the real security chain admitted a request. */
  @RestController
  static class Probe {
    /** Returns a fixed success after security, without simulating domain authorization. */
    @RequestMapping("/**")
    String reached() {
      return "reached";
    }
  }
}
