package com.blockout.collector.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.blockout.collector.acquisition.application.CollectPassage;
import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.CollectionBackendFailure;
import com.blockout.collector.acquisition.application.CollectionStageMapperImpl;
import com.blockout.collector.acquisition.application.CollectorLifecycle;
import com.blockout.collector.acquisition.application.DiscoverSeasonSources;
import com.blockout.collector.acquisition.application.FfvbAcquisition;
import com.blockout.collector.acquisition.application.LnvAcquisition;
import com.blockout.collector.acquisition.application.SportingBackend;
import com.blockout.collector.generated.ingestion.model.CollectionCycleStateEnum;
import com.blockout.collector.generated.ingestion.model.CollectionModeEnum;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.CollectionTargetKindEnum;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Qualifies native collector diagnostics from controlled failures without network calls. */
@ExtendWith(OutputCaptureExtension.class)
@SpringBootTest(
    classes = LoggingTest.LoggingConfiguration.class,
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {
      "spring.main.banner-mode=off",
      "spring.main.log-startup-info=false",
      "spring.main.keep-alive=false"
    })
@DisplayName("Collector telemetry context and privacy")
class LoggingTest {
  private static final Logger LOG = LoggerFactory.getLogger(LoggingTest.class);

  @Test
  @DisplayName("Retains the context of a failed passage with unconfirmed evidence and completion")
  void retainsUnconfirmedPassageContext(CapturedOutput output) {
    // Given
    Instant now = Instant.parse("2026-10-21T08:00:00Z");
    UUID control = UUID.fromString("00000000-0000-4000-8000-000000000153");
    UUID scope = UUID.fromString("00000000-0000-4000-8000-000000000154");
    CollectionBackend backend = mock(CollectionBackend.class);
    CollectorLifecycle lifecycle = new CollectorLifecycle(backend);
    when(backend.current()).thenReturn(new CollectionBackend.Runtime(0, null));
    when(backend.register(0, lifecycle.getIncarnationId()))
        .thenReturn(new CollectionBackend.Runtime(1, lifecycle.getIncarnationId()));
    when(backend.admit(any()))
        .thenAnswer(
            call -> {
              CollectionBackend.StartCycle command = call.getArgument(0);
              return new CollectionBackend.Cycle(
                  command.cycleId(),
                  command.incarnationId(),
                  command.controlId(),
                  null,
                  1,
                  CollectionModeEnum.PERIODIC,
                  CollectionCycleStateEnum.RUNNING,
                  false,
                  null);
            });
    lifecycle.start();
    CollectorLifecycle.AdmittedCycle admitted = lifecycle.admit(control, null, 0, null);
    CollectionBackend.Target target =
        CollectionBackend.Target.builder()
            .scopeId(scope)
            .poolId(scope)
            .provider(CollectionProviderEnum.FFVB)
            .kind(CollectionTargetKindEnum.CALENDAR)
            .build();
    when(backend.targets(admitted.getCycle().id(), 0))
        .thenReturn(new CollectionBackend.TargetPage(List.of(target), 0, false));
    FfvbAcquisition ffvb = mock(FfvbAcquisition.class);
    URI source = URI.create("https://provider.example.invalid/calendar");
    when(ffvb.resourceUrl(target)).thenReturn(source);
    when(ffvb.read(source)).thenThrow(new IllegalStateException("private-provider-body"));
    CollectionBackendFailure responseLost =
        new CollectionBackendFailure(
            CollectionBackendFailure.Kind.UNCONFIRMED,
            new IllegalStateException("harmless-secret"));
    when(backend.record(eq(admitted.getCycle().id()), any())).thenThrow(responseLost);
    when(backend.complete(admitted.getCycle().id(), now)).thenThrow(responseLost);
    when(backend.cycle(admitted.getCycle().id())).thenReturn(admitted.getCycle());
    CollectPassage passage =
        new CollectPassage(
            backend,
            mock(SportingBackend.class),
            ffvb,
            mock(LnvAcquisition.class),
            mock(com.blockout.collector.acquisition.application.ClubSheets.class),
            mock(com.blockout.collector.acquisition.application.MunicipalGeocoder.class),
            mock(DiscoverSeasonSources.class),
            lifecycle,
            Clock.fixed(now, ZoneOffset.UTC),
            new CollectionStageMapperImpl());

    // When
    boolean confirmed = passage.execute(admitted);

    // Then
    assertThat(confirmed).isFalse();
    assertThat(output.getAll()).doesNotContain("private-provider-body", "harmless-secret");
    JsonMapper json = JsonMapper.builder().build();
    List<JsonNode> events = output.getOut().lines().map(json::readTree).toList();
    assertThat(events)
        .extracting(event -> event.path("cycleId").asText())
        .containsOnly(admitted.getCycle().id().toString());
    assertThat(events)
        .filteredOn(event -> event.path("operation").asText().equals("collection_acquisition"))
        .singleElement()
        .satisfies(
            event -> {
              assertThat(event.path("scope").asText()).isEqualTo(scope.toString());
              assertThat(event.path("stage").asText()).isEqualTo("calendar");
              assertThat(event.path("reason").asText()).isEqualTo("IllegalStateException");
            });
    assertThat(events)
        .filteredOn(event -> event.path("operation").asText().equals("collection_result"))
        .singleElement()
        .satisfies(
            event -> {
              assertThat(event.path("scope").asText()).isEqualTo(scope.toString());
              assertThat(event.path("stage").asText()).isEqualTo("calendar");
              assertThat(event.path("phase").asText()).isEqualTo("acquisition");
              assertThat(event.path("outcome").asText()).isEqualTo("unconfirmed");
            });
    assertThat(events)
        .filteredOn(event -> event.path("operation").asText().equals("collection_completion"))
        .singleElement()
        .satisfies(event -> assertThat(event.path("outcome").asText()).isEqualTo("unconfirmed"));
  }

  @Test
  @DisplayName("Preserves a failed stage without credentials, payloads or personal references")
  void excludesSensitiveContext(CapturedOutput output) {
    // Given
    IllegalStateException failure =
        new IllegalStateException("harmless-secret", new RuntimeException("private-provider-body"));
    try (MDC.MDCCloseable ignored = MDC.putCloseable("email", "private@example.invalid")) {
      // When
      LOG.atError()
          .addKeyValue("operation", "source_read")
          .addKeyValue("stage", "acquisition")
          .addKeyValue("outcome", "failed")
          .addKeyValue("provider", "ffvb")
          .addKeyValue("authorization", "Bearer harmless-secret")
          .addKeyValue("payload", "private-provider-body")
          .addKeyValue("account_cleanup.original_account_id", "unapproved-personal-reference")
          .setCause(failure)
          .log("https://example.invalid/private?token=harmless-secret");
    }

    // Then
    assertThat(output.getAll())
        .doesNotContain(
            "harmless-secret",
            "private-provider-body",
            "private@example.invalid",
            "unapproved-personal-reference",
            "example.invalid/private");
    JsonNode event = JsonMapper.builder().build().readTree(output.getOut().strip());
    assertThat(event.path("service").path("name").asText()).isEqualTo("blockout-collector");
    assertThat(event.path("operation").asText()).isEqualTo("source_read");
    assertThat(event.path("stage").asText()).isEqualTo("acquisition");
    assertThat(event.path("outcome").asText()).isEqualTo("failed");
    assertThat(event.path("provider").asText()).isEqualTo("ffvb");
    assertThat(event.path("error").path("type").asText())
        .isEqualTo(IllegalStateException.class.getName());
    assertThat(event.has("account_cleanup")).isFalse();
  }

  /** Supplies only a configuration source; no source adapter or generated client is initialized. */
  @Configuration(proxyBeanMethods = false)
  static class LoggingConfiguration {}
}
