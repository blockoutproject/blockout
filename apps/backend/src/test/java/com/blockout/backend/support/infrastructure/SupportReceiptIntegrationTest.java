package com.blockout.backend.support.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.SubmitSupportRequest;
import com.blockout.backend.generated.mobile.model.SupportRequestCreatedResponse;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.support.api.SupportApiMapperImpl;
import com.blockout.backend.support.api.SupportController;
import com.blockout.backend.support.application.CreateSupportRequest;
import com.blockout.backend.support.application.SupportAttachments;
import com.blockout.backend.support.application.SupportCases;
import com.blockout.backend.support.application.SupportSignal;
import com.blockout.backend.support.application.SupportValidation;
import java.net.http.HttpClient;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/**
 * Connects real intake adapters, child process, generated MVC and optionally the mobile form.
 * Provider HTTP responses and the executable's upload effects are controlled. No private provider,
 * native image preparation, permissions or erasure is qualified; admission has its own suites.
 */
@SpringBootTest(
    classes = SupportReceiptIntegrationTest.TestApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {"management.endpoint.health.group.readiness.include=readinessState"})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@ExtendWith(OutputCaptureExtension.class)
@DisplayName("Complete support receipt through real adapters and generated HTTP")
class SupportReceiptIntegrationTest {
  @TempDir static Path temporaryDirectory;
  @LocalServerPort private int port;
  @Autowired private ProviderBoundary provider;
  @Autowired private JsonMapper json;
  private final List<String> createdBodies = new ArrayList<>();

  /** Resets only this suite's controlled provider expectations and transient upload evidence. */
  @BeforeEach
  void resetBoundary() throws Exception {
    provider.server().reset();
    try (java.util.stream.Stream<Path> paths = Files.walk(temporaryDirectory.resolve("uploads"))) {
      for (Path path : paths.sorted(java.util.Comparator.reverseOrder()).toList()) {
        if (!path.equals(temporaryDirectory.resolve("uploads"))) {
          Files.delete(path);
        }
      }
    }
  }

  /** Every expected provider write happens once; unconfirmed intake leaves no live originals. */
  @AfterEach
  void verifiesEffects() {
    provider.server().verify();
    assertThat(temporaryDirectory.resolve("originals")).isEmptyDirectory();
  }

  @ParameterizedTest
  @EnumSource(value = Scenario.class, names = "LOST_RESPONSE", mode = EnumSource.Mode.EXCLUDE)
  @DisplayName("Publishes complete acceptance or a canonical refusal from actual adapter faults")
  void qualifiesHttpReceipt(Scenario scenario, CapturedOutput output) throws Exception {
    // Given
    prepareAttempt(scenario, false);

    // When
    ResponseEntity<String> response = submit("Synthetic receipt");

    // Then
    assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");
    assertThat(response.getHeaders().getLocation()).isNull();
    if (scenario.accepted()) {
      assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
      SupportRequestCreatedResponse receipt =
          json.readValue(response.getBody(), SupportRequestCreatedResponse.class);
      assertThat(receipt.getRequestId()).isNotNull();
      assertThat(createdBodies.getFirst()).contains(receipt.getRequestId().toString());
      assertThat(json.readTree(response.getBody()).properties()).hasSize(1);
    } else {
      assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
      assertThat(response.getHeaders().getContentType())
          .isEqualTo(MediaType.APPLICATION_PROBLEM_JSON);
      assertThat(json.readTree(response.getBody()).get("type").asText())
          .isEqualTo("urn:blockout:problem:unavailable");
      assertThat(json.readTree(response.getBody()).get("status").asInt()).isEqualTo(503);
    }
    assertUploads(scenario, false);
    if (scenario == Scenario.SIGNAL_FAILED) {
      assertThat(output.getAll())
          .contains("\"stage\":\"signal\"")
          .doesNotContain("synthetic-token");
    }
  }

  @ParameterizedTest
  @EnumSource(Scenario.class)
  @EnabledIfEnvironmentVariable(named = "BLOCKOUT_SUPPORT_CONSUMERS_TEST", matches = "true")
  @DisplayName("Drives the actual form through adapter faults and an explicit new attempt")
  void qualifiesFormReceipt(Scenario scenario) throws Exception {
    // Given: each failed/lost response permits a new case, never mutation of the earlier case.
    boolean retry = !scenario.accepted() || scenario == Scenario.LOST_RESPONSE;
    prepareAttempt(scenario, retry);
    Path repository = Path.of("..", "..").toAbsolutePath().normalize();
    Path log = repository.resolve("apps/backend/target/support-receipt-" + scenario + ".log");
    ProcessBuilder builder =
        new ProcessBuilder(
                "node",
                repository.resolve("node_modules/jest/bin/jest.js").toString(),
                "--config",
                "jest.config.cjs",
                "--runInBand",
                "--runTestsByPath",
                "src/features/support/__tests__/support-receipt-integration.test.tsx")
            .directory(repository.resolve("apps/mobile").toFile())
            .redirectErrorStream(true)
            .redirectOutput(log.toFile());
    builder.environment().put("BLOCKOUT_SUPPORT_PROVIDER_URL", "http://127.0.0.1:" + port);
    builder.environment().put("BLOCKOUT_SUPPORT_RECEIPT_SCENARIO", scenario.wireName());

    // When
    Process consumer = builder.start();
    try {
      boolean finished = consumer.waitFor(Duration.ofSeconds(90));

      // Then
      assertThat(finished).as("Form suite completes; details in %s", log).isTrue();
      assertThat(consumer.exitValue()).as("Form assertions; details in %s", log).isZero();
      assertUploads(scenario, retry);
      assertThat(createdBodies).hasSize(retry ? 2 : 1);
      if (retry) {
        assertThat(createdBodies.getLast()).isNotEqualTo(createdBodies.getFirst());
      }
    } finally {
      consumer.destroyForcibly();
      assertThat(consumer.waitFor(5, TimeUnit.SECONDS)).as("Jest child terminates").isTrue();
    }
  }

  /**
   * Configures provider effects visible to real adapters; unexpected calls fail the test.
   *
   * @param scenario first attempt's concrete fault, if any
   * @param retry whether the form explicitly creates a corrected second attempt
   */
  private void prepareAttempt(Scenario scenario, boolean retry) throws Exception {
    if (scenario == Scenario.PARTIAL) {
      Files.writeString(temporaryDirectory.resolve("uploads/partial"), "31");
    }
    expectAttempt(31L, "Synthetic receipt", scenario);
    if (retry) {
      expectAttempt(32L, "Synthetic corrected receipt", Scenario.COMPLETE);
    }
  }

  /**
   * Expects creation, all-file completion and a secondary signal only after confirmed acceptance.
   * No confirmation read, old-case search, upload replay, rollback or issue-body update is
   * accepted.
   *
   * @param issue synthetic case number for this independent attempt
   * @param title immutable title selected before sending
   * @param scenario concrete provider outcome
   */
  private void expectAttempt(long issue, String title, Scenario scenario) {
    String issueUrl = "https://api.github.com/repos/fictional-org/private-support/issues";
    provider
        .server()
        .expect(requestTo(issueUrl))
        .andExpect(method(HttpMethod.POST))
        .andExpect(jsonPath("$.title").value(title))
        .andExpect(jsonPath("$.labels[0]").value("incomplete"))
        .andExpect(jsonPath("$.body", containsString("Description retained")))
        .andExpect(jsonPath("$.body", containsString("reply@example.invalid")))
        .andExpect(
            request ->
                createdBodies.add(
                    json.readTree(((MockClientHttpRequest) request).getBodyAsString())
                        .get("body")
                        .asText()))
        .andRespond(
            withStatus(HttpStatus.CREATED)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"number\":" + issue + ",\"labels\":[{\"name\":\"incomplete\"}]}"));
    if (scenario == Scenario.PARTIAL) {
      return;
    }
    provider
        .server()
        .expect(requestTo(issueUrl + "/" + issue + "/labels"))
        .andExpect(method(HttpMethod.POST))
        .andExpect(content().json("{\"labels\":[\"complete\"]}"))
        .andExpect(
            request ->
                assertThat(temporaryDirectory.resolve("uploads/" + issue + "/1"))
                    .as(
                        "The last selected image reaches the controlled provider before complete marking")
                    .isRegularFile())
        .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));
    provider
        .server()
        .expect(requestTo(issueUrl + "/" + issue + "/labels/incomplete"))
        .andExpect(method(HttpMethod.DELETE))
        .andRespond(
            withStatus(
                scenario == Scenario.MARK_REFUSED
                    ? HttpStatus.FORBIDDEN
                    : scenario == Scenario.MARK_UNCONFIRMED
                        ? HttpStatus.SERVICE_UNAVAILABLE
                        : HttpStatus.OK));
    if (scenario.accepted()) {
      provider
          .server()
          .expect(requestTo("https://discord.com/api/webhooks/1/synthetic?wait=true"))
          .andExpect(method(HttpMethod.POST))
          .andExpect(
              content()
                  .json(
                      "{\"content\":\"A support request has been received. "
                          + "https://github.com/fictional-org/private-support/issues\"}"))
          .andRespond(
              withStatus(
                  scenario == Scenario.SIGNAL_FAILED
                      ? HttpStatus.SERVICE_UNAVAILABLE
                      : HttpStatus.OK));
    }
  }

  /**
   * Submits generated metadata and two real synthetic images via Spring's multipart converter.
   *
   * @param title immutable fictional title for this explicit send
   * @return actual servlet response, including ordinary failures
   */
  private ResponseEntity<String> submit(String title) throws Exception {
    SubmitSupportRequest metadata =
        json.readValue(
            new ClassPathResource("support/complete-metadata.json").getContentAsByteArray(),
            SubmitSupportRequest.class);
    metadata.setTitle(title);
    metadata.setDescription("Description retained");
    metadata.setReplyEmail("reply@example.invalid");
    MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    parts.add("metadata", new HttpEntity<>(metadata, headers));
    for (String format : List.of("png", "jpg")) {
      parts.add(
          "images",
          new ByteArrayResource(
              new ClassPathResource("support/synthetic." + format).getContentAsByteArray()) {
            /** {@inheritDoc} */
            @Override
            public String getFilename() {
              return "synthetic." + format;
            }
          });
    }
    try (HttpClient client =
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
      JdkClientHttpRequestFactory requests = new JdkClientHttpRequestFactory(client);
      requests.setReadTimeout(Duration.ofSeconds(15));
      return RestClient.builder()
          .baseUrl("http://127.0.0.1:" + port)
          .requestFactory(requests)
          .build()
          .post()
          .uri("/support-requests")
          .contentType(MediaType.MULTIPART_FORM_DATA)
          .body(parts)
          .retrieve()
          .onStatus(status -> status.isError(), (request, response) -> {})
          .toEntity(String.class);
    }
  }

  /**
   * Verifies exact successful image bytes and one process invocation per explicit attempt.
   *
   * @param scenario first attempt's concrete fault
   * @param retry whether another case was explicitly submitted
   */
  private void assertUploads(Scenario scenario, boolean retry) throws Exception {
    Path uploads = temporaryDirectory.resolve("uploads");
    assertThat(Files.readAllLines(uploads.resolve("invocations")))
        .containsExactlyElementsOf(retry ? List.of("31", "32") : List.of("31"));
    assertThat(Files.readAllBytes(uploads.resolve("31/0")))
        .isEqualTo(new ClassPathResource("support/synthetic.png").getContentAsByteArray());
    assertThat(Files.exists(uploads.resolve("31/1"))).isEqualTo(scenario != Scenario.PARTIAL);
    if (scenario != Scenario.PARTIAL) {
      assertThat(Files.readAllBytes(uploads.resolve("31/1")))
          .isEqualTo(new ClassPathResource("support/synthetic.jpg").getContentAsByteArray());
    }
    if (retry) {
      assertThat(Files.readAllBytes(uploads.resolve("32/0")))
          .isEqualTo(new ClassPathResource("support/synthetic.png").getContentAsByteArray());
      assertThat(Files.readAllBytes(uploads.resolve("32/1")))
          .isEqualTo(new ClassPathResource("support/synthetic.jpg").getContentAsByteArray());
    }
  }

  /** Independent first-attempt effects; response loss is introduced only after the actual 201. */
  enum Scenario {
    COMPLETE,
    PARTIAL,
    MARK_REFUSED,
    MARK_UNCONFIRMED,
    SIGNAL_FAILED,
    LOST_RESPONSE;

    /** Whether this backend attempt can confirm every attachment and its complete marking. */
    boolean accepted() {
      return this == Scenario.COMPLETE
          || this == Scenario.SIGNAL_FAILED
          || this == Scenario.LOST_RESPONSE;
    }

    /** Names the scenario for the single mobile process, without test-only production state. */
    String wireName() {
      return name().toLowerCase(java.util.Locale.ROOT).replace('_', '-');
    }
  }

  /**
   * Replaces provider HTTP I/O only, preserving real REST serialization and failure translation.
   *
   * @param client actual native REST serialization over controlled provider responses
   * @param server ordered expectations rejecting missing or additional effects
   */
  record ProviderBoundary(RestClient client, MockRestServiceServer server) {}

  /** Isolated intake servlet; security/admission is qualified separately by its owning suites. */
  @Configuration(proxyBeanMethods = false)
  @EnableAutoConfiguration(exclude = DataSourceAutoConfiguration.class)
  @Import({
    SupportController.class,
    SupportApiMapperImpl.class,
    CreateSupportRequest.class,
    SupportDiagnostics.class,
    HttpConfiguration.class,
    ApiExceptionHandler.class
  })
  static class TestApplication {
    /** Supplies one expectation-bound native REST transport for both real provider adapters. */
    @Bean
    ProviderBoundary provider() {
      RestClient.Builder builder = RestClient.builder().baseUrl("https://api.github.com");
      MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
      return new ProviderBoundary(builder.build(), server);
    }

    /** Keeps original input under this suite's exclusive transient ownership. */
    @Bean
    SupportValidation validation() throws Exception {
      return new SupportValidation(
          Files.createDirectories(temporaryDirectory.resolve("originals")));
    }

    /**
     * Connects real GitHub intake to synthetic HTTP rather than a mocked application port.
     *
     * @param provider controlled external HTTP I/O shared by the real adapters
     */
    @Bean
    SupportCases cases(ProviderBoundary provider) {
      return new GitHubSupportClient(provider.client(), destination());
    }

    /** Connects the real bounded process adapter to a JVM child with controlled partial effects. */
    @Bean
    SupportAttachments attachments() throws Exception {
      Path uploads = Files.createDirectories(temporaryDirectory.resolve("uploads"));
      return new GitHubAttachmentProcess(
          List.of(
              Path.of(System.getProperty("java.home"), "bin", "java").toString(),
              "-cp",
              System.getProperty("java.class.path"),
              Child.class.getName(),
              uploads.toString()),
          destination(),
          Duration.ofSeconds(5));
    }

    /**
     * Connects the actual generic signal and its diagnostic failure owner.
     *
     * @param provider controlled external HTTP I/O shared by the real adapters
     * @param diagnostics actual safe failure owner
     */
    @Bean
    SupportSignal signal(ProviderBoundary provider, SupportDiagnostics diagnostics) {
      return new DiscordSupportSignal(provider.client(), destination(), diagnostics);
    }

    /**
     * Isolates receipt behavior from separately tested credentials and F12 admission.
     *
     * @param http test-local native servlet security configuration
     */
    @Bean
    SecurityFilterChain receiptSecurity(HttpSecurity http) throws Exception {
      return http.csrf(csrf -> csrf.disable())
          .authorizeHttpRequests(access -> access.anyRequest().permitAll())
          .build();
    }

    /** Fixed fictional provider inputs; no external request can escape the controlled transport. */
    private static SupportProperties.Destination destination() {
      return new SupportProperties.Destination(
          "fictional-org/private-support",
          "incomplete",
          "complete",
          "synthetic-token",
          "https://discord.com/api/webhooks/1/synthetic");
    }
  }

  /** Models successful upload bytes followed by a later failure in a real owned child process. */
  public static final class Child {
    /**
     * Copies original bytes as controlled provider effects, returning nonzero after the first file
     * only when explicitly requested. These copies never represent actual hosted attachments.
     *
     * @param args suite-owned evidence directory followed by the production CLI argument vector
     */
    public static void main(String[] args) throws Exception {
      Path uploads = Path.of(args[0]);
      String issue = args[3];
      Files.writeString(
          uploads.resolve("invocations"),
          issue + "\n",
          StandardOpenOption.CREATE,
          StandardOpenOption.APPEND);
      Path caseUploads = Files.createDirectory(uploads.resolve(issue));
      for (int index = 6; index < args.length; index += 2) {
        Files.copy(
            Path.of(args[index + 1]), caseUploads.resolve(Integer.toString((index - 6) / 2)));
        if (Files.exists(uploads.resolve("partial")) && issue.equals("31")) {
          System.exit(1);
        }
      }
    }
  }
}
