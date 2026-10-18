package com.blockout.backend.access.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.ChangeApplicationVersionsRequest;
import com.blockout.backend.generated.mobile.model.ChangeMaintenanceRequest;
import com.blockout.backend.generated.mobile.model.EstablishAccount200Response;
import com.blockout.backend.generated.mobile.model.GetApplicationAccess200Response;
import com.blockout.backend.generated.mobile.model.SetMaintenanceActivationRequest;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import jakarta.validation.Valid;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.json.JsonMapper;

/**
 * Exercises generated request binding through MVC and response serialization through Jackson.
 * Test-only request adapters supply no settings, permission or admission implementation.
 */
@WebMvcTest
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  AccessContractWebMvcTest.BindingAdapter.class
})
@DisplayName("Generated access contract binding")
class AccessContractWebMvcTest {
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
        "{\"revision\":9007199254740992}",
        "{\"revision\":0,\"future\":true}",
        "{\"revision\":0,\"ios\":{\"future\":true}}",
        "{\"revision\":0,\"ios\":null}",
        "{\"revision\":0,\"message\":\"\"}"
      })
  @DisplayName("Rejects invalid version changes with canonical non-cacheable errors")
  void rejectsInvalidVersionChange(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post("/contract/versions").contentType(MediaType.APPLICATION_JSON).content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"))
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":0}",
        "{\"revision\":9007199254740991,\"ios\":{}}",
        "{\"revision\":0,\"message\":null,\"ios\":{\"minimumVersion\":null,\"storeUrl\":null}}",
        "{\"revision\":0,\"ios\":{\"minimumVersion\":\"2.10.0\",\"storeUrl\":\"https://apps.apple.com/app/id123\"}}"
      })
  @DisplayName("Preserves omitted, null and supplied version fields")
  void preservesVersionPresence(String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post("/contract/versions").contentType(MediaType.APPLICATION_JSON).content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isOk()).andExpect(content().json(body, JsonCompareMode.STRICT));
  }

  @ParameterizedTest
  @CsvSource(
      delimiter = '|',
      value = {
        "maintenance|{\"revision\":0,\"active\":true}",
        "maintenance|{\"revision\":0,\"message\":null}",
        "activation|{\"revision\":0}",
        "activation|{\"revision\":0,\"active\":null}",
        "activation|{\"revision\":0,\"active\":\"true\"}",
        "activation|{\"revision\":0,\"active\":true,\"message\":\"Unexpected\"}"
      })
  @DisplayName("Keeps content edits separate from explicit boolean activation")
  void rejectsInvalidMaintenanceChange(String route, String body) throws Exception {
    // Given
    MockHttpServletRequestBuilder request =
        post("/contract/" + route).contentType(MediaType.APPLICATION_JSON).content(body);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Serializes complete nullable access groups and additive response fields")
  void preservesCompleteAccess() throws Exception {
    // Given
    String body =
        """
        {
          "maintenance": {"revision":9007199254740991,"active":false,"message":null,"imageUrl":null},
          "versions": {
            "revision":9007199254740991,
            "ios":{"minimumVersion":null,"storeUrl":null,"future":true},
            "android":{"minimumVersion":null,"storeUrl":null},"message":null
          },
          "future":true
        }
        """;

    GetApplicationAccess200Response response =
        mapper.readValue(body, GetApplicationAccess200Response.class);

    // When
    String serialized = mapper.writeValueAsString(response);

    // Then
    assertThat(mapper.readTree(serialized)).isEqualTo(mapper.readTree(body));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"manageMaintenance\":false}",
        "{\"manageMaintenance\":true,\"future\":true}"
      })
  @DisplayName("Preserves absent and boolean permissions without inserting privileges")
  void preservesPermissions(String permissions) throws Exception {
    // Given
    String body = accountWithPermissions(permissions);
    EstablishAccount200Response response =
        mapper.readValue(body, EstablishAccount200Response.class);

    // When
    String serialized = mapper.writeValueAsString(response);

    // Then
    assertThat(mapper.readTree(serialized)).isEqualTo(mapper.readTree(body));
  }

  /**
   * Supplies required synthetic account data while keeping decisive permission input explicit.
   *
   * @param permissions raw JSON for the permission projection under test
   * @return complete account JSON
   */
  private static String accountWithPermissions(String permissions) {
    return """
        {"accountId":"00000000-0000-4000-8000-000000000001","username":"Synthetic",
         "email":"fixture@example.invalid","principalCreatedAt":null,"hasPhoto":false,
         "permissions":%s}
        """
        .formatted(permissions);
  }

  /** Exposes generated request DTOs to MVC without implementing future business endpoints. */
  @RestController
  static class BindingAdapter {
    /**
     * Returns bound partial version settings without interpreting presence as a domain mutation.
     *
     * @param body generated partial version change
     * @return unchanged transport value
     */
    @PostMapping(value = "/contract/versions", consumes = "application/json")
    ChangeApplicationVersionsRequest versions(
        @Valid @RequestBody ChangeApplicationVersionsRequest body) {
      return body;
    }

    /**
     * Returns bound maintenance content independently of activation.
     *
     * @param body generated content change
     * @return unchanged transport value
     */
    @PostMapping(value = "/contract/maintenance", consumes = "application/json")
    ChangeMaintenanceRequest maintenance(@Valid @RequestBody ChangeMaintenanceRequest body) {
      return body;
    }

    /**
     * Returns the desired activation state without toggling it.
     *
     * @param body generated activation change
     * @return unchanged transport value
     */
    @PostMapping(value = "/contract/activation", consumes = "application/json")
    SetMaintenanceActivationRequest activation(
        @Valid @RequestBody SetMaintenanceActivationRequest body) {
      return body;
    }
  }
}
