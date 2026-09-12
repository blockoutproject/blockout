package com.blockout.backend.worker.application;

import com.blockout.backend.jobs.application.Job;
import com.blockout.backend.jobs.application.JobRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.spi.LoggingEventBuilder;

/** Scheduler-owned diagnostics. Payloads, deduplication keys and lease tokens are never emitted. */
public final class WorkerTelemetry {
  private static final Logger LOG = LoggerFactory.getLogger(WorkerTelemetry.class);
  private final MeterRegistry metrics;
  private boolean pollDegraded;

  public WorkerTelemetry(JobRepository jobs, MeterRegistry metrics) {
    this.metrics = metrics;
    for (String state : List.of("pending", "running", "succeeded", "dead"))
      metrics.gauge(
          "blockout.jobs.count",
          List.of(Tag.of("state", state)),
          jobs,
          j -> {
            try {
              return j.count(state);
            } catch (RuntimeException unavailable) {
              return Double.NaN;
            }
          });
    metrics.gauge(
        "blockout.jobs.oldest.available.seconds",
        jobs,
        j -> {
          try {
            return j.oldestAvailableSeconds();
          } catch (RuntimeException unavailable) {
            return Double.NaN;
          }
        });
  }

  public <T> void readiness(T owner, java.util.function.ToDoubleFunction<T> ready) {
    metrics.gauge("blockout.worker.ready", owner, ready);
  }

  public void started(int concurrency) {
    LOG.atInfo()
        .addKeyValue("event", "worker.started")
        .addKeyValue("concurrency", concurrency)
        .log("Worker started");
  }

  public void stopped(int remaining) {
    LOG.atInfo()
        .addKeyValue("event", "worker.stopped")
        .addKeyValue("active_attempts", remaining)
        .log("Worker stopped accepting work");
  }

  /** A repeated outage emits one transition, then a recovery, rather than one event per poll. */
  public synchronized void pollUnavailable(Throwable failure) {
    if (pollDegraded) return;
    pollDegraded = true;
    var event =
        LOG.atError()
            .addKeyValue("event", "worker.poll.unavailable")
            .addKeyValue("dependency", "postgresql");
    if (failure != null) event.setCause(diagnostic(failure, new AtomicInteger(16)));
    event.log("Job polling unavailable; durable work remains recoverable");
  }

  public synchronized void pollRecovered() {
    if (!pollDegraded) return;
    pollDegraded = false;
    LOG.atInfo().addKeyValue("event", "worker.poll.recovered").log("Job polling recovered");
  }

  public void completed() {
    metrics.counter("blockout.jobs.executions", "outcome", "completed").increment();
  }

  public void rejected(Job job, String code) {
    metrics.counter("blockout.jobs.executions", "outcome", "rejected").increment();
    attempt(LOG.atWarn(), "worker.job.rejected", job)
        .addKeyValue("reason", code)
        .log("Job permanently rejected");
  }

  public void unsupported(Job job) {
    metrics.counter("blockout.jobs.failed", "reason", "unsupported").increment();
    attempt(LOG.atWarn(), "worker.job.unsupported", job).log("No compatible job handler");
  }

  public void failed(Job job, Exception failure, boolean recorded) {
    metrics.counter("blockout.jobs.executions", "outcome", "failed").increment();
    attempt(LOG.atError(), "worker.job.failed", job)
        .addKeyValue("failure_recorded", recorded)
        .addKeyValue("retry_exhausted", job.attempts() >= job.maxAttempts())
        .setCause(diagnostic(failure, new AtomicInteger(16)))
        .log("Job execution failed; lease and retry policy apply");
  }

  public void leaseLost(Job job) {
    attempt(LOG.atWarn(), "worker.job.lease_lost", job).log("Attempt no longer owns its lease");
  }

  public void timedOut(Job job) {
    metrics.counter("blockout.jobs.timeouts").increment();
    attempt(LOG.atWarn(), "worker.job.deadline", job).log("Execution deadline reached");
  }

  private LoggingEventBuilder attempt(LoggingEventBuilder event, String name, Job job) {
    return event
        .addKeyValue("event", name)
        .addKeyValue("job_id", job.id())
        .addKeyValue("attempt", job.attempts())
        .addKeyValue("payload_version", job.version());
  }

  /**
   * JDBC/provider exception messages can contain rows, URLs and credentials. Preserve bounded
   * exception types, frames, causes and suppressed failures as a throwable snapshot, never their
   * messages. A shared sixteen-node budget bounds the whole graph and terminates cycles.
   */
  private static Throwable diagnostic(Throwable failure, AtomicInteger remaining) {
    if (failure == null || remaining.getAndDecrement() <= 0) return null;
    var safe =
        new Throwable(failure.getClass().getName(), diagnostic(failure.getCause(), remaining));
    safe.setStackTrace(
        Arrays.copyOf(failure.getStackTrace(), Math.min(100, failure.getStackTrace().length)));
    for (Throwable suppressed : Arrays.stream(failure.getSuppressed()).limit(4).toList()) {
      Throwable child = diagnostic(suppressed, remaining);
      if (child != null) safe.addSuppressed(child);
    }
    return safe;
  }
}
