package com.blockout.backend.sporting.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.LogoActionEnum;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.service.ClubDetailsService;
import com.blockout.backend.sporting.application.service.SportingPresentationService;
import com.blockout.backend.sporting.support.SportingImageFixture;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.converter.FormHttpMessageConverter;
import org.springframework.mock.http.MockHttpOutputMessage;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * Real Servlet PATCH parsing with the production controller; use cases/admission are controlled.
 */
@SpringBootTest(
    classes = SportingPresentationMultipartIntegrationTest.TestApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "management.endpoint.health.group.readiness.include=readinessState")
@DisplayName("Servlet sporting multipart PATCH")
class SportingPresentationMultipartIntegrationTest {
  private static final UUID CLUB = UUID.fromString("00000000-0000-4000-8000-000000000193");
  @LocalServerPort private int port;
  @MockitoBean private CurrentAccount account;
  @MockitoBean private SportingPresentationService presentation;
  @MockitoBean private ClubDetailsService contacts;

  @Test
  @DisplayName("Parses explicit null metadata and replacement bytes on a real multipart PATCH")
  void parsesRealPatch() throws Exception {
    // Given
    when(account.id()).thenReturn(CLUB);
    when(presentation.set(any(), any(), any(), any())).thenReturn(view());
    byte[] image = SportingImageFixture.image("PNG", 0x112233);
    MockHttpOutputMessage form =
        encode("{\"revision\":\"0\",\"manualName\":null,\"logoAction\":\"replace\"}", image);

    // When
    HttpResponse<String> response = send(form);

    // Then
    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(response.headers().firstValue("Cache-Control")).contains("no-store");
    assertThat(response.body()).contains("\"manualName\":null");
    ArgumentCaptor<SportingPresentation.Edit> edit =
        ArgumentCaptor.forClass(SportingPresentation.Edit.class);
    verify(presentation).set(any(), any(), any(), edit.capture());
    assertThat(edit.getValue().manualName()).isNull();
    assertThat(edit.getValue().logoAction()).isEqualTo(LogoActionEnum.REPLACE);
    assertThat(edit.getValue().image().bytes()).isEqualTo(image);
  }

  @ParameterizedTest
  @ValueSource(ints = {0, 1})
  @DisplayName(
      "Accepts the exact five MiB image boundary and refuses the next byte in the container")
  void enforcesNativeFileBound(int extra) throws Exception {
    // Given
    when(account.id()).thenReturn(CLUB);
    when(presentation.set(any(), any(), any(), any())).thenReturn(view());
    byte[] image = Arrays.copyOf(SportingImageFixture.image("PNG", 0x112233), 5_242_880 + extra);
    MockHttpOutputMessage form =
        encode("{\"revision\":\"0\",\"manualName\":null,\"logoAction\":\"replace\"}", image);

    // When
    HttpResponse<String> response = send(form);

    // Then
    assertThat(response.statusCode()).isEqualTo(extra == 0 ? 200 : 413);
  }

  @Test
  @DisplayName("Refuses omitted required metadata instead of treating it as an explicit null")
  void rejectsOmittedManualName() throws Exception {
    // Given
    MockHttpOutputMessage form = encode("{\"revision\":\"0\",\"logoAction\":\"keep\"}", null);

    // When
    HttpResponse<String> response = send(form);

    // Then
    assertThat(response.statusCode()).isEqualTo(400);
  }

  /**
   * Encodes ordinary JSON and optional actual file parts through Spring's native form converter.
   *
   * @param metadata scenario-owned exact JSON, retaining null or omission
   * @param image optional original image
   * @return actual HTTP multipart bytes and content type
   * @throws Exception if native encoding fails
   */
  private MockHttpOutputMessage encode(String metadata, byte[] image) throws Exception {
    MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
    HttpHeaders jsonHeaders = new HttpHeaders();
    jsonHeaders.setContentType(MediaType.APPLICATION_JSON);
    parts.add("metadata", new HttpEntity<>(metadata.getBytes(StandardCharsets.UTF_8), jsonHeaders));
    if (image != null)
      parts.add(
          "image",
          new ByteArrayResource(image) {
            /** {@inheritDoc} */
            @Override
            public String getFilename() {
              return "synthetic.png";
            }
          });
    MockHttpOutputMessage output = new MockHttpOutputMessage();
    new FormHttpMessageConverter().write(parts, MediaType.MULTIPART_FORM_DATA, output);
    return output;
  }

  /**
   * Sends a PATCH through loopback to the actual isolated Tomcat Servlet multipart parser.
   *
   * @param form framework-encoded multipart body
   * @return native HTTP status and response body
   * @throws Exception if the bounded local request fails
   */
  private HttpResponse<String> send(MockHttpOutputMessage form) throws Exception {
    try (HttpClient client =
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
      HttpRequest request =
          HttpRequest.newBuilder(
                  URI.create(
                      "http://localhost:"
                          + port
                          + "/administration/clubs/"
                          + CLUB
                          + "/presentation"))
              .timeout(Duration.ofSeconds(15))
              .header("Content-Type", form.getHeaders().getContentType().toString())
              .method("PATCH", HttpRequest.BodyPublishers.ofByteArray(form.getBodyAsBytes()))
              .build();
      return client.send(request, HttpResponse.BodyHandlers.ofString());
    }
  }

  /**
   * @return synthetic presentation supplied by the controlled use case after real HTTP binding
   */
  private SportingPresentation.View view() {
    return new SportingPresentation.View(
        CLUB,
        Kind.CLUB,
        "1",
        new SportingPresentation.Names("Club", "Club", null, null, null),
        new SportingPresentation.Logo(null, null, null));
  }

  /** Isolated native web runtime, with no database/provider and no alternate test endpoint. */
  @Configuration(proxyBeanMethods = false)
  @EnableAutoConfiguration(exclude = DataSourceAutoConfiguration.class)
  @Import({
    SportingPresentationController.class,
    SportingPresentationMapperImpl.class,
    SportingObservationMapperImpl.class,
    SportingAdministrationMapperImpl.class,
    HttpConfiguration.class,
    ApiExceptionHandler.class,
    SportingExceptionHandler.class
  })
  static class TestApplication {
    /**
     * Opens this test runtime only; production JWT/grant behavior has separate MVC/SQL evidence.
     *
     * @param http native test security builder
     * @return isolated permit-only chain for parsing qualification
     * @throws Exception if the native chain cannot start
     */
    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {
      return http.csrf(csrf -> csrf.disable())
          .authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
          .build();
    }
  }
}
