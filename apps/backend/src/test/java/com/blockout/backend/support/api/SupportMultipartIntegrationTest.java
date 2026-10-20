package com.blockout.backend.support.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.api.SupportApi;
import com.blockout.backend.generated.mobile.model.SubmitSupportRequest;
import com.blockout.backend.generated.mobile.model.SupportRequestCreatedResponse;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.FormHttpMessageConverter;
import org.springframework.mock.http.MockHttpOutputMessage;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Exercises servlet byte limits over loopback HTTP; no database, native device or provider. */
@SpringBootTest(
    classes = SupportMultipartIntegrationTest.TestApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {"management.endpoint.health.group.readiness.include=readinessState"})
@DisplayName("Native support multipart limits")
class SupportMultipartIntegrationTest {
  @LocalServerPort private int port;

  @ParameterizedTest
  @ValueSource(ints = {0, 1})
  @DisplayName("Accepts exactly 26 MiB and refuses the next byte including metadata and overhead")
  void enforcesRequestLimit(int extraByte) throws Exception {
    // Given
    byte[] image =
        Arrays.copyOf(
            new ClassPathResource("support/synthetic.png").getContentAsByteArray(), 5_242_880);
    // Keep the metadata Content-Length at seven digits for both encodings.
    byte[] initial = encode(image, 5, 1_000_000).getBodyAsBytes();
    int padding = 1_000_000 + 27_262_976 + extraByte - initial.length;
    MockHttpOutputMessage multipart = encode(image, 5, padding);

    // When
    HttpResponse<String> response = send(multipart);

    // Then
    assertThat(multipart.getBodyAsBytes().length).isEqualTo(27_262_976 + extraByte);
    assertThat(response.statusCode()).isEqualTo(extraByte == 0 ? 201 : 413);
  }

  @ParameterizedTest
  @ValueSource(ints = {0, 1})
  @DisplayName("Accepts exactly five MiB per file and refuses the next byte")
  void enforcesFileLimit(int extraByte) throws Exception {
    // Given
    byte[] image =
        Arrays.copyOf(
            new ClassPathResource("support/synthetic.png").getContentAsByteArray(),
            5_242_880 + extraByte);
    MockHttpOutputMessage multipart = encode(image, 1, 0);

    // When
    HttpResponse<String> response = send(multipart);

    // Then
    assertThat(response.statusCode()).isEqualTo(extraByte == 0 ? 201 : 413);
  }

  /**
   * Uses Spring's ordinary multipart encoder with a deterministic boundary only for exact sizing.
   *
   * @param image original synthetic bytes
   * @param count number of repeated file parts
   * @param metadataPadding legal JSON whitespace, included in the request-size calculation
   * @return framework-encoded multipart content and headers
   */
  private static MockHttpOutputMessage encode(byte[] image, int count, int metadataPadding)
      throws Exception {
    FormHttpMessageConverter converter =
        new FormHttpMessageConverter() {
          /** {@inheritDoc} */
          @Override
          protected byte[] generateMultipartBoundary() {
            return "BlockoutSupport151Boundary".getBytes(StandardCharsets.US_ASCII);
          }
        };
    MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
    HttpHeaders metadataHeaders = new HttpHeaders();
    metadataHeaders.setContentType(MediaType.APPLICATION_JSON);
    String metadata =
        new ClassPathResource("support/metadata.json").getContentAsString(StandardCharsets.UTF_8);
    parts.add(
        "metadata",
        new HttpEntity<>(
            (metadata + " ".repeat(metadataPadding)).getBytes(StandardCharsets.UTF_8),
            metadataHeaders));
    for (int index = 0; index < count; index++) {
      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.IMAGE_PNG);
      parts.add(
          "images",
          new HttpEntity<>(
              new ByteArrayResource(image) {
                /** {@inheritDoc} */
                @Override
                public String getFilename() {
                  return "synthetic.png";
                }
              },
              headers));
    }
    MockHttpOutputMessage output = new MockHttpOutputMessage();
    converter.write(parts, MediaType.MULTIPART_FORM_DATA, output);
    return output;
  }

  /**
   * Submits a framework-encoded request to the isolated servlet container.
   *
   * @param multipart Spring-encoded request
   * @return actual loopback server response, with finite client waiting
   */
  private HttpResponse<String> send(MockHttpOutputMessage multipart) throws Exception {
    try (HttpClient client =
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
      HttpRequest request =
          HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/support-requests"))
              .timeout(Duration.ofSeconds(15))
              .header("Content-Type", multipart.getHeaders().getContentType().toString())
              .POST(HttpRequest.BodyPublishers.ofByteArray(multipart.getBodyAsBytes()))
              .build();
      return client.send(request, HttpResponse.BodyHandlers.ofString());
    }
  }

  /**
   * Starts the real servlet multipart resolver, generated binding and existing error translation.
   */
  @Configuration(proxyBeanMethods = false)
  @EnableAutoConfiguration(exclude = DataSourceAutoConfiguration.class)
  @Import({BindingAdapter.class, HttpConfiguration.class, ApiExceptionHandler.class})
  static class TestApplication {
    /**
     * Opens only the test adapter so multipart parsing can be exercised independently of admission.
     *
     * @param http framework test security builder
     * @return public test-only boundary; business admission is outside this foundation test
     * @throws Exception if native security initialization fails
     */
    @Bean
    SecurityFilterChain testSecurity(HttpSecurity http) throws Exception {
      return http.csrf(csrf -> csrf.disable())
          .authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
          .build();
    }
  }

  /** Implements the real generated boundary solely to exercise servlet parsing. */
  @RestController
  static class BindingAdapter implements SupportApi {
    /** {@inheritDoc} */
    @Override
    public ResponseEntity<SupportRequestCreatedResponse> createSupportRequest(
        SubmitSupportRequest metadata, Boolean bypass, List<MultipartFile> images) {
      return ResponseEntity.status(201)
          .body(
              new SupportRequestCreatedResponse(
                  UUID.fromString("00000000-0000-4000-8000-000000000001")));
    }
  }
}
