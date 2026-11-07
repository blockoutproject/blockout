package com.blockout.backend.support.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.mobile.model.SubmitSupportRequest;
import com.blockout.backend.generated.mobile.model.SupportRequestCreatedResponse;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.support.application.CreateSupportRequest;
import com.blockout.backend.support.application.SupportAttachments;
import com.blockout.backend.support.application.SupportCases;
import com.blockout.backend.support.application.SupportSignal;
import com.blockout.backend.support.application.SupportSubmission;
import com.blockout.backend.support.application.SupportUnavailableException;
import com.blockout.backend.support.application.SupportValidation;
import com.blockout.backend.support.infrastructure.SupportDiagnostics;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
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
import org.springframework.http.converter.FormHttpMessageConverter;
import org.springframework.mock.http.MockHttpOutputMessage;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import tools.jackson.databind.json.JsonMapper;

/**
 * Exercises generated Java/TypeScript multipart over loopback with the real controller, validation
 * and complete-send use case. Admission, signing keys and provider effects alone are controlled; no
 * database, device, private upload or provider permission is qualified.
 */
@SpringBootTest(
    classes = SupportMultipartIntegrationTest.TestApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {"management.endpoint.health.group.readiness.include=readinessState"})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@DisplayName("Generated support multipart over local HTTP")
class SupportMultipartIntegrationTest {
  @TempDir static Path temporaryDirectory;
  private static HttpServer keys;
  private static RSAKey signingKey;
  private static String issuer;
  @LocalServerPort private int port;
  @Autowired private JsonMapper json;
  @MockitoSpyBean private CreateSupportRequest create;
  @MockitoBean private SupportCases cases;
  @MockitoBean private SupportAttachments attachments;
  @MockitoBean private SupportSignal signal;
  @MockitoBean private MaintenanceAdmission admission;
  private final List<byte[]> receivedImages = new ArrayList<>();

  /**
   * Serves synthetic signing keys to the real resource-server decoder on an isolated port.
   *
   * @param properties registry for this suite's public trust input
   * @throws Exception if local key generation or loopback binding fails
   */
  @DynamicPropertySource
  static void identityIssuer(DynamicPropertyRegistry properties) throws Exception {
    signingKey = new RSAKeyGenerator(2048).keyID("support-multipart").generate();
    keys = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    keys.createContext(
        "/.well-known/jwks.json",
        exchange -> {
          byte[] body =
              new JWKSet(signingKey.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          exchange.sendResponseHeaders(200, body.length);
          exchange.getResponseBody().write(body);
          exchange.close();
        });
    keys.start();
    issuer = "http://127.0.0.1:" + keys.getAddress().getPort() + "/";
    properties.add("blockout.security.issuer", () -> issuer);
  }

  /** Stops only this suite's signing-key server. */
  @AfterAll
  static void closeKeys() {
    if (keys != null) {
      keys.stop(0);
    }
  }

  /** Records exact original bytes while the real use case owns the private temporary files. */
  @BeforeEach
  void recordProviderInput() {
    when(cases.create(any())).thenReturn(31L);
    doAnswer(
            invocation -> {
              List<Path> images = invocation.getArgument(1);
              for (Path image : images) {
                receivedImages.add(Files.readAllBytes(image));
              }
              return null;
            })
        .when(attachments)
        .attach(eq(31L), anyList());
  }

  /** Checks that both accepted and refused requests leave no private originals behind. */
  @AfterEach
  void removesTemporaryOriginals() throws Exception {
    try (Stream<Path> files = Files.list(temporaryDirectory)) {
      assertThat(files).isEmpty();
    }
  }

  @Test
  @DisplayName("Preserves all metadata and five distinct originals through generated Java bindings")
  void bindsCompleteSubmission() throws Exception {
    // Given
    List<byte[]> images = distinctImages();
    MockHttpOutputMessage multipart = encode(images, 0);

    // When
    HttpResponse<String> response = send(multipart);

    // Then
    assertComplete(response);
    verify(create).create(eq(expectedMetadata()), anyList());
    assertThat(receivedImages)
        .usingElementComparator(Arrays::compare)
        .containsExactlyElementsOf(images);
    verify(cases).complete(31L);
    verify(signal).accepted();
  }

  @ParameterizedTest
  @ValueSource(ints = {0, 1})
  @DisplayName("Accepts exactly 26 MiB and refuses the next byte including metadata and overhead")
  void enforcesRequestLimit(int extraByte) throws Exception {
    // Given
    byte[] image =
        Arrays.copyOf(
            new ClassPathResource("support/synthetic.png").getContentAsByteArray(), 5_242_880);
    List<byte[]> images = Collections.nCopies(5, image);
    // Keep metadata Content-Length at seven digits for both framework encodings.
    byte[] initial = encode(images, 1_000_000).getBodyAsBytes();
    int padding = 1_000_000 + 27_262_976 + extraByte - initial.length;
    MockHttpOutputMessage multipart = encode(images, padding);

    // When
    HttpResponse<String> response = send(multipart);

    // Then
    assertThat(multipart.getBodyAsBytes().length).isEqualTo(27_262_976 + extraByte);
    if (extraByte == 0) {
      assertComplete(response);
      verify(create).create(eq(expectedMetadata()), anyList());
      assertThat(receivedImages)
          .usingElementComparator(Arrays::compare)
          .containsExactlyElementsOf(images);
      verify(cases).complete(31L);
    } else {
      assertProblem(response, 413, "payload-too-large");
      verifyNoInteractions(cases, attachments, signal);
    }
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
    MockHttpOutputMessage multipart = encode(List.of(image), 0);

    // When
    HttpResponse<String> response = send(multipart);

    // Then
    if (extraByte == 0) {
      assertComplete(response);
      assertThat(receivedImages).usingElementComparator(Arrays::compare).containsExactly(image);
      verify(cases).complete(31L);
    } else {
      assertProblem(response, 413, "payload-too-large");
      verifyNoInteractions(cases, attachments, signal);
    }
  }

  @Test
  @EnabledIfEnvironmentVariable(named = "BLOCKOUT_SUPPORT_CONSUMERS_TEST", matches = "true")
  @DisplayName("Qualifies the generated TypeScript client against the same local backend")
  void qualifiesTypeScriptConsumer() throws Exception {
    // Given: explicit controlled provider refusal and current permission denial.
    when(cases.create(argThat(draft -> draft.title().equals("Synthetic provider refusal"))))
        .thenThrow(
            new SupportUnavailableException(
                SupportUnavailableException.Stage.CREATE,
                SupportUnavailableException.Reason.REFUSED));
    doAnswer(
            invocation -> {
              if ((boolean) invocation.getArgument(2)) {
                throw new AccessDeniedException("Synthetic denied bypass");
              }
              return null;
            })
        .when(admission)
        .requireOrdinaryAccess(nullable(String.class), nullable(String.class), anyBoolean());
    Path repository = Path.of("..", "..").toAbsolutePath().normalize();
    Path log = repository.resolve("apps/backend/target/support-multipart-consumers.log");
    ProcessBuilder builder =
        new ProcessBuilder(
                "node",
                repository.resolve("node_modules/jest/bin/jest.js").toString(),
                "--config",
                "jest.config.cjs",
                "--runInBand",
                "--runTestsByPath",
                "src/features/support/__tests__/support-multipart-integration.test.ts")
            .directory(repository.resolve("apps/mobile").toFile())
            .redirectErrorStream(true)
            .redirectOutput(log.toFile());
    builder.environment().put("BLOCKOUT_SUPPORT_PROVIDER_URL", "http://127.0.0.1:" + port);
    builder.environment().put("BLOCKOUT_SUPPORT_DENIED_TOKEN", deniedToken());

    // When
    Process consumer = builder.start();
    try {
      boolean finished = consumer.waitFor(Duration.ofSeconds(90));

      // Then
      assertThat(finished).as("Jest completes; details in %s", log).isTrue();
      assertThat(consumer.exitValue())
          .as("Generated consumer assertions; details in %s", log)
          .isZero();
      verify(create).create(eq(expectedMetadata()), argThat(images -> images.size() == 5));
      assertThat(receivedImages)
          .usingElementComparator(Arrays::compare)
          .containsExactlyElementsOf(distinctImages());
      verify(cases).complete(31L);
      verify(signal).accepted();
    } finally {
      consumer.destroyForcibly();
      assertThat(consumer.waitFor(5, TimeUnit.SECONDS)).as("Jest child terminates").isTrue();
    }
  }

  /**
   * Checks the complete generated response and privacy headers after actual server processing.
   *
   * @param response actual loopback response
   */
  private void assertComplete(HttpResponse<String> response) {
    assertThat(response.statusCode()).isEqualTo(201);
    assertThat(response.headers().firstValue("Cache-Control")).contains("no-store");
    assertThat(response.headers().firstValue("Location")).isEmpty();
    assertThat(json.readTree(response.body()).properties()).hasSize(1);
    assertThat(json.readValue(response.body(), SupportRequestCreatedResponse.class).getRequestId())
        .isNotNull();
  }

  /**
   * Checks canonical body, status and headers rather than the status alone.
   *
   * @param response actual loopback refusal
   * @param status expected canonical status
   * @param type expected canonical problem suffix
   */
  private void assertProblem(HttpResponse<String> response, int status, String type) {
    assertThat(response.statusCode()).isEqualTo(status);
    assertThat(response.headers().firstValue("Content-Type")).contains("application/problem+json");
    assertThat(response.headers().firstValue("Cache-Control")).contains("no-store");
    assertThat(response.headers().firstValue("Location")).isEmpty();
    assertThat(json.readTree(response.body()).get("status").asInt()).isEqualTo(status);
    assertThat(json.readTree(response.body()).get("type").asText())
        .isEqualTo("urn:blockout:problem:" + type);
  }

  /**
   * Reads every shared fictional declaration independently of the MapStruct mapping under test.
   *
   * @return complete expected metadata, including nested target and sign-in facts
   * @throws Exception if the shared fixture cannot be read
   */
  private SupportSubmission.Metadata expectedMetadata() throws Exception {
    return json.readValue(
        new ClassPathResource("support/complete-metadata.json").getContentAsByteArray(),
        SupportSubmission.Metadata.class);
  }

  /**
   * Gives each real PNG/JPEG original a distinct trailing byte, shared with the TS consumer.
   *
   * @return five valid originals in their expected submission order
   * @throws Exception if a synthetic fixture cannot be read
   */
  private static List<byte[]> distinctImages() throws Exception {
    List<byte[]> images = new ArrayList<>();
    for (int index = 0; index < 5; index++) {
      byte[] original =
          new ClassPathResource("support/synthetic." + (index % 2 == 0 ? "png" : "jpg"))
              .getContentAsByteArray();
      byte[] image = Arrays.copyOf(original, original.length + 1);
      image[original.length] = (byte) index;
      images.add(image);
    }
    return images;
  }

  /**
   * Uses Spring's ordinary multipart encoder; a fixed boundary permits exact byte sizing. Metadata
   * is serialized from the generated Java DTO, without a handwritten transport copy.
   *
   * @param images every original file in order
   * @param metadataPadding legal trailing JSON whitespace counted inside the request limit
   * @return framework-encoded multipart content and headers
   * @throws Exception if fixtures or native encoding fail
   */
  private MockHttpOutputMessage encode(List<byte[]> images, int metadataPadding) throws Exception {
    FormHttpMessageConverter converter =
        new FormHttpMessageConverter() {
          /** {@inheritDoc} */
          @Override
          protected byte[] generateMultipartBoundary() {
            return "BlockoutSupport306Boundary".getBytes(StandardCharsets.US_ASCII);
          }
        };
    SubmitSupportRequest metadata =
        json.readValue(
            new ClassPathResource("support/complete-metadata.json").getContentAsByteArray(),
            SubmitSupportRequest.class);
    MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
    HttpHeaders metadataHeaders = new HttpHeaders();
    metadataHeaders.setContentType(MediaType.APPLICATION_JSON);
    parts.add(
        "metadata",
        new HttpEntity<>(
            (json.writeValueAsString(metadata) + " ".repeat(metadataPadding))
                .getBytes(StandardCharsets.UTF_8),
            metadataHeaders));
    for (byte[] image : images) {
      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
      parts.add(
          "images",
          new HttpEntity<>(
              new ByteArrayResource(image) {
                /** {@inheritDoc} */
                @Override
                public String getFilename() {
                  return "synthetic-original";
                }
              },
              headers));
    }
    MockHttpOutputMessage output = new MockHttpOutputMessage();
    converter.write(parts, MediaType.MULTIPART_FORM_DATA, output);
    return output;
  }

  /**
   * Submits a framework-encoded request with finite client waiting to the isolated servlet.
   *
   * @param multipart ordinary Spring-encoded request
   * @return actual loopback server response
   * @throws Exception if the local HTTP exchange fails
   */
  private HttpResponse<String> send(MockHttpOutputMessage multipart) throws Exception {
    try (HttpClient client =
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
      HttpRequest request =
          HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/support-requests"))
              .timeout(Duration.ofSeconds(15))
              .header("Content-Type", multipart.getHeaders().getContentType().toString())
              .POST(HttpRequest.BodyPublishers.ofByteArray(multipart.getBodyAsBytes()))
              .build();
      return client.send(request, HttpResponse.BodyHandlers.ofString());
    }
  }

  /**
   * Signs a synthetic mobile principal for a real authenticated permission refusal.
   *
   * @return short-lived fixture credential accepted only by this suite's local issuer
   */
  private static String deniedToken() {
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(issuer)
            .subject("support-multipart-denied")
            .audience(List.of("mobile-test"))
            .claim("azp", "mobile-test")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(180))
            .build();
    return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(signingKey)))
        .encode(
            JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).keyId(signingKey.getKeyID()).build(),
                claims))
        .getTokenValue();
  }

  /** Starts the generated controller and native servlet/security stack without a database. */
  @Configuration(proxyBeanMethods = false)
  @EnableAutoConfiguration(exclude = DataSourceAutoConfiguration.class)
  @Import({
    SupportController.class,
    SupportApiMapperImpl.class,
    CreateSupportRequest.class,
    SupportDiagnostics.class,
    HttpConfiguration.class,
    SecurityConfiguration.class,
    ApiExceptionHandler.class
  })
  static class TestApplication {
    /**
     * Keeps real validation originals in a suite-owned temporary directory for cleanup assertions.
     *
     * @return actual validation without any provider or durable storage
     */
    @Bean
    SupportValidation supportValidation() {
      return new SupportValidation(temporaryDirectory);
    }
  }
}
