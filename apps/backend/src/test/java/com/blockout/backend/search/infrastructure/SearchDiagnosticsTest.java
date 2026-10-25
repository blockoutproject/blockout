package com.blockout.backend.search.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.blockout.backend.search.application.SearchDocuments;
import com.blockout.backend.search.application.SearchProjection;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Changed;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch.indices.GetAliasRequest;
import org.opensearch.client.transport.OpenSearchTransport;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Actual Boot ECS encoder and native metrics; dependency failures carry synthetic private data. */
@ExtendWith(OutputCaptureExtension.class)
@SpringBootTest(
    classes = SearchDiagnosticsTest.LoggingConfiguration.class,
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {"spring.main.banner-mode=off", "spring.main.log-startup-info=false"})
@DisplayName("Safe search projection diagnostics")
class SearchDiagnosticsTest {
  @Test
  @DisplayName(
      "Keeps last success truthful across failed full runs without logging private messages")
  void preservesLatestSuccess(CapturedOutput output) {
    // Given
    SearchProjection projection = mock(SearchProjection.class);
    SimpleMeterRegistry registry = new SimpleMeterRegistry();
    SearchProjectionScheduler scheduler =
        new SearchProjectionScheduler(
            projection,
            mock(ThreadPoolTaskScheduler.class),
            new SearchProjectionProperties(Duration.ofHours(1)),
            registry);
    doThrow(
            new IllegalStateException(
                "private-query private-city private-contact credential raw-payload"))
        .when(projection)
        .rebuild();

    // When
    scheduler.rebuild();
    double before = registry.get("search.projection.last.success.time").gauge().value();
    doNothing().when(projection).rebuild();
    scheduler.rebuild();
    double successful = registry.get("search.projection.last.success.time").gauge().value();
    doThrow(new IllegalStateException("raw-payload")).when(projection).rebuild();
    scheduler.rebuild();

    // Then
    assertThat(before).isZero();
    assertThat(successful).isPositive();
    assertThat(registry.get("search.projection.last.success.time").gauge().value())
        .isEqualTo(successful);
    assertThat(
            registry
                .get("search.projection.runs")
                .tags("action", "rebuild", "outcome", "failed")
                .counter()
                .count())
        .isEqualTo(2);
    assertThat(output.getAll())
        .contains("search_projection", "last_success_at", "failed")
        .doesNotContain(
            "private-query", "private-city", "private-contact", "credential", "raw-payload");
  }

  @Test
  @DisplayName("Diagnoses rejected transient submissions without propagating them to the committer")
  void diagnosesRejectedSubmission(CapturedOutput output) {
    // Given
    ThreadPoolTaskScheduler tasks = mock(ThreadPoolTaskScheduler.class);
    doThrow(new TaskRejectedException("private-query credential"))
        .when(tasks)
        .execute(any(Runnable.class));
    SimpleMeterRegistry registry = new SimpleMeterRegistry();
    SearchProjectionScheduler scheduler =
        new SearchProjectionScheduler(
            mock(SearchProjection.class),
            tasks,
            new SearchProjectionProperties(Duration.ofHours(1)),
            registry);

    // When
    scheduler.submit(new Changed(Set.of()));

    // Then
    assertThat(
            registry
                .get("search.projection.runs")
                .tags("action", "submission", "outcome", "failed")
                .counter()
                .count())
        .isEqualTo(1);
    assertThat(output.getAll())
        .contains("submission", "failed")
        .doesNotContain("private-query", "credential");
  }

  @Test
  @DisplayName("Rejects failed items in an HTTP-success bulk without logging native error payloads")
  void diagnosesBulkItems(CapturedOutput output) throws Exception {
    // Given
    OpenSearchClient client = mock(OpenSearchClient.class);
    when(client.bulk(any(org.opensearch.client.opensearch.core.BulkRequest.class)))
        .thenReturn(
            new org.opensearch.client.opensearch.core.BulkResponse.Builder()
                .errors(true)
                .took(1)
                .items(
                    item ->
                        item.operationType(
                                org.opensearch.client.opensearch.core.bulk.OperationType.Index)
                            .index("blockout-local-search-diag")
                            .status(400)
                            .error(
                                error ->
                                    error
                                        .type("mapper_parsing_exception")
                                        .reason(
                                            "private-query private-city credential raw-payload")))
                .build());
    OpenSearchProjectionWriter writer =
        new OpenSearchProjectionWriter(
            client, new SearchIndexProperties("blockout-local-search-diag"));
    SearchProjection projection = mock(SearchProjection.class);
    org.mockito.Mockito.doAnswer(
            invocation -> {
              writer.write(
                  "blockout-local-search-diag",
                  List.of(
                      new SearchDocuments(
                          UUID.fromString("00000000-0000-4000-8000-000000000001"),
                          List.of("Private name"),
                          List.of(),
                          "private-city",
                          null,
                          null,
                          null,
                          null)));
              return null;
            })
        .when(projection)
        .rebuild();
    SimpleMeterRegistry registry = new SimpleMeterRegistry();
    SearchProjectionScheduler scheduler =
        new SearchProjectionScheduler(
            projection,
            mock(ThreadPoolTaskScheduler.class),
            new SearchProjectionProperties(Duration.ofHours(1)),
            registry);

    // When
    scheduler.rebuild();

    // Then
    assertThat(registry.get("search.projection.last.success.time").gauge().value()).isZero();
    assertThat(output.getAll())
        .contains("SearchProjectionBulkException", "\"affected_count\":1", "\"partial_count\":0")
        .doesNotContain(
            "private-query", "private-city", "credential", "raw-payload", "Private name");
  }

  @Test
  @DisplayName("Logs cleanup failure without deleting when current aliases cannot be read")
  void diagnosesCleanupFailure(CapturedOutput output) throws Exception {
    // Given
    OpenSearchTransport transport = mock(OpenSearchTransport.class);
    when(transport.performRequest(any(GetAliasRequest.class), any(), any()))
        .thenThrow(new IOException("private-city raw-payload"));
    OpenSearchProjectionWriter writer =
        new OpenSearchProjectionWriter(
            new OpenSearchClient(transport),
            new SearchIndexProperties("blockout-local-search-diag"));

    // When
    writer.cleanup();

    // Then
    assertThat(output.getAll())
        .contains("cleanup", "failed")
        .doesNotContain("private-city", "raw-payload");
    verify(transport).performRequest(any(GetAliasRequest.class), any(), any());
    verifyNoMoreInteractions(transport);
  }

  /** Starts only the native logging boundary, without SQL or background projection work. */
  @Configuration(proxyBeanMethods = false)
  static class LoggingConfiguration {}
}
