package com.blockout.backend.worker.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.ThrowableProxyUtil;
import ch.qos.logback.core.read.ListAppender;
import com.blockout.backend.jobs.application.Job;
import com.blockout.backend.jobs.application.JobRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class WorkerTelemetryTest {
  final Logger logger = (Logger) LoggerFactory.getLogger(WorkerTelemetry.class);
  final ListAppender<ILoggingEvent> logs = new ListAppender<>();
  final SimpleMeterRegistry metrics = new SimpleMeterRegistry();
  final WorkerTelemetry telemetry = new WorkerTelemetry(mock(JobRepository.class), metrics);

  @BeforeEach
  void capture() {
    logs.start();
    logger.addAppender(logs);
  }

  @AfterEach
  void release() {
    logger.detachAppender(logs);
    logs.stop();
    metrics.close();
  }

  @Test
  void retainsDiagnosticFramesWithoutExceptionMessagesOrJobContent() {
    var job =
        new Job(UUID.randomUUID(), "private-owner", 1, "private-payload", UUID.randomUUID(), 1, 5);
    var failure =
        new IllegalStateException(
            "private-response", new IllegalArgumentException("private-token"));
    failure.addSuppressed(new RuntimeException("private-database-row"));

    telemetry.failed(job, failure, false);

    assertThat(logs.list).hasSize(1);
    var event = logs.list.getFirst();

    assertThat(event.getLevel()).isEqualTo(Level.ERROR);

    assertThat(event.getKeyValuePairs())
        .anySatisfy(
            pair -> {
              assertThat(pair.key).isEqualTo("event.action");
              assertThat(pair.value).isEqualTo("worker.job.failed");
            });
    String diagnostic = ThrowableProxyUtil.asString(event.getThrowableProxy());

    assertThat(diagnostic)
        .contains(
            "java.lang.IllegalStateException",
            "java.lang.IllegalArgumentException",
            "java.lang.RuntimeException",
            "retainsDiagnosticFramesWithoutExceptionMessagesOrJobContent");

    assertThat(event.getFormattedMessage() + event.getKeyValuePairs() + diagnostic)
        .doesNotContain("private-", job.leaseToken().toString());
  }

  @Test
  void logsAnOutageOnceUntilRecovery() {
    telemetry.pollUnavailable(new IllegalStateException("sensitive"));
    telemetry.pollUnavailable(new IllegalStateException("sensitive"));
    telemetry.pollRecovered();
    telemetry.pollRecovered();

    assertThat(logs.list).hasSize(2);

    assertThat(logs.list)
        .extracting(ILoggingEvent::getLevel)
        .containsExactly(Level.ERROR, Level.INFO);
  }

  @Test
  void recordsSuccessWithoutPerJobLogNoise() {
    telemetry.completed();

    assertThat(logs.list).isEmpty();

    assertThat(
            metrics.get("blockout.jobs.executions").tag("outcome", "completed").counter().count())
        .isEqualTo(1);
  }
}
