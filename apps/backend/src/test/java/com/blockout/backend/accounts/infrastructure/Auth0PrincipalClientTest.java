package com.blockout.backend.accounts.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.auth0.client.mgmt.ManagementApi;
import com.blockout.backend.accounts.application.PrincipalReader;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Protocol;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

/** Real SDK request/decoding with controlled native HTTP responses; no live tenant is accessed. */
@DisplayName("Exact Auth0 principal lookup")
@ExtendWith(OutputCaptureExtension.class)
class Auth0PrincipalClientTest {
  private final ValidatorFactory validators = Validation.buildDefaultValidatorFactory();
  private Request request;
  private OkHttpClient http;

  /** Releases only this suite's SDK transport and native validator. */
  @AfterEach
  void close() {
    if (http != null) {
      http.connectionPool().evictAll();
      http.dispatcher().executorService().shutdown();
    }
    validators.close();
  }

  @Test
  @DisplayName("Reads only minimal evidence for the exact encoded principal")
  void readsExactPrincipal(CapturedOutput output) {
    // Given
    String body =
        """
        {"user_id":"auth0|one","email":"shared@example.invalid",
         "name":"Private name","picture":"https://private.example.invalid/photo",
         "identities":[{"provider":"google-oauth2","connection":"google-oauth2","profileData":{"email":"other@example.invalid"}},
                       {"provider":"apple","connection":"apple"}]}
        """;
    Auth0PrincipalClient client = client(body, 200);

    // When
    PrincipalReader.Evidence result = client.read("https://identity.example.invalid/", "auth0|one");

    // Then
    assertThat(request.url().encodedPath()).isEqualTo("/api/v2/users/auth0%7Cone");
    assertThat(request.url().queryParameter("fields")).isEqualTo("user_id,email");
    assertThat(request.url().queryParameter("include_fields")).isEqualTo("true");
    assertThat(result.email()).isEqualTo("shared@example.invalid");
    assertThat(output)
        .doesNotContain(
            "Private name",
            "shared@example.invalid",
            "private.example.invalid/photo",
            "synthetic-server-token");
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"user_id\":\"auth0|one\"}",
        "{\"user_id\":\"auth0|one\",\"email\":\"not-an-email\"}",
        "{\"user_id\":\"auth0|one\",\"email\":\" \"}"
      })
  @DisplayName("Keeps missing or unusable email unknown")
  void keepsMissingEmailUnknown(String body) {
    // Given
    Auth0PrincipalClient client = client(body, 200);

    // When
    PrincipalReader.Evidence result = client.read("https://identity.example.invalid/", "auth0|one");

    // Then
    assertThat(result.email()).isNull();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"user_id\":\"auth0|other\",\"email\":\"shared@example.invalid\"}",
        "{}",
        "not-json"
      })
  @DisplayName("Refuses an unproven principal or malformed provider representation")
  void refusesUnprovenPrincipal(String response) {
    // Given
    Auth0PrincipalClient client = client(response, 200);

    // When / Then
    assertThatThrownBy(() -> client.read("https://identity.example.invalid/", "auth0|one"))
        .isInstanceOf(AccountUnavailableException.class);
  }

  @Test
  @DisplayName("Translates provider refusal without logging its private payload")
  void refusesProviderFailureSafely(CapturedOutput output) {
    // Given
    Auth0PrincipalClient client = client("{\"message\":\"private provider payload\"}", 429);

    // When / Then
    assertThatThrownBy(() -> client.read("https://identity.example.invalid/", "auth0|one"))
        .isInstanceOf(AccountUnavailableException.class)
        .hasMessageNotContaining("private provider payload");
    assertThat(output).doesNotContain("private provider payload", "synthetic-server-token");
  }

  /**
   * Creates the real SDK adapter with one explicit response at its native HTTP interceptor seam.
   *
   * @param body synthetic response payload owned by the scenario
   * @param status HTTP status supplied without network access
   * @return the production reader using this scenario's response
   */
  private Auth0PrincipalClient client(String body, int status) {
    http =
        new OkHttpClient.Builder()
            .addInterceptor(
                chain -> {
                  request = chain.request();
                  return new Response.Builder()
                      .request(request)
                      .protocol(Protocol.HTTP_1_1)
                      .code(status)
                      .message("controlled")
                      .body(ResponseBody.create(body, MediaType.get("application/json")))
                      .build();
                })
            .build();
    return new Auth0PrincipalClient(
        ManagementApi.builder()
            .domain("identity.example.invalid")
            .token("synthetic-server-token")
            .httpClient(http)
            .maxRetries(0)
            .build(),
        validators.getValidator());
  }
}
