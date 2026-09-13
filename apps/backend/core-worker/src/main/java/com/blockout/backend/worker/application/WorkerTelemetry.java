package com.blockout.backend.worker.application;

import com.blockout.backend.jobs.application.Job;
import com.blockout.backend.jobs.application.JobRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.spi.LoggingEventBuilder;

/** Scheduler-owned diagnostics. Payloads, deduplication keys and lease tokens are never emitted. */
public final class WorkerTelemetry {
  private static final Logger LOG = LoggerFactory.getLogger(WorkerTelemetry.class);
  private final MeterRegistry metrics;
  private boolean pollDegraded;

  /**
   * Registers bounded queue gauges; unavailable SQL reads produce NaN rather than a false zero.
   *
   * @param jobs queue metric reads
   * @param metrics application-owned meter registry
   */
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
            } catch (RuntimeException _) {
              return Double.NaN;
            }
          });
    metrics.gauge(
        "blockout.jobs.oldest.available.seconds",
        jobs,
        j -> {
          try {
            return j.oldestAvailableSeconds();
          } catch (RuntimeException _) {
            return Double.NaN;
          }
        });
  }

  /**
   * Registers worker readiness against the retained scheduler instance.
   *
   * @param <T> type of the readiness owner
   * @param owner scheduler retained by the application
   * @param ready side-effect-free numeric readiness projection
   */
  public <T> void readiness(T owner, java.util.function.ToDoubleFunction<T> ready) {
    metrics.gauge("blockout.worker.ready", owner, ready);
  }

  /**
   * Logs the scheduler startup and configured execution capacity.
   *
   * @param concurrency maximum simultaneous handler executions
   */
  public void started(int concurrency) {
    LOG.atInfo()
        .addKeyValue("event.action", "worker.started")
        .addKeyValue("concurrency", concurrency)
        .log("Worker started");
  }

  /**
   * Logs scheduler shutdown with the number of attempts still exiting.
   *
   * @param remaining active attempts after the shutdown grace and interruption
   */
  public void stopped(int remaining) {
    LOG.atInfo()
        .addKeyValue("event.action", "worker.stopped")
        .addKeyValue("active_attempts", remaining)
        .log("Worker stopped accepting work");
  }

  /**
   * Reports only the first polling failure until a recovery occurs.
   *
   * @param failure original SQL failure, or null when schema readiness alone prevents polling
   */
  public synchronized void pollUnavailable(Throwable failure) {
    if (pollDegraded) return;
    pollDegraded = true;
    var event =
        LOG.atError()
            .addKeyValue("event.action", "worker.poll.unavailable")
            .addKeyValue("dependency", "postgresql");
    if (failure != null) event.setCause(failure);
    event.log("Job polling unavailable; durable work remains recoverable");
  }

  /** Logs recovery once after polling resumes following an outage. */
  public synchronized void pollRecovered() {
    if (!pollDegraded) return;
    pollDegraded = false;
    LOG.atInfo().addKeyValue("event.action", "worker.poll.recovered").log("Job polling recovered");
  }

  /** Counts a successful fenced acknowledgement without emitting a per-record success log. */
  public void completed() {
    metrics.counter("blockout.jobs.executions", "outcome", "completed").increment();
  }

  /**
   * Counts and logs an owner rejection after its permanent queue transition commits.
   *
   * @param job rejected attempt with safe technical identifiers
   * @param code bounded owner rejection code, never payload content
   */
  public void rejected(Job job, String code) {
    metrics.counter("blockout.jobs.executions", "outcome", "rejected").increment();
    attempt(LOG.atWarn(), "worker.job.rejected", job)
        .addKeyValue("reason", code)
        .log("Job permanently rejected");
  }

  /**
   * Reports work whose registered type/version has no compatible handler.
   *
   * @param job permanently rejected attempt
   */
  public void unsupported(Job job) {
    metrics.counter("blockout.jobs.failed", "reason", "unsupported").increment();
    attempt(LOG.atWarn(), "worker.job.unsupported", job).log("No compatible job handler");
  }

  /**
   * Reports an unexpected execution failure once, retaining its throwable for native ECS
   * formatting.
   *
   * @param job failed attempt with safe technical metadata
   * @param failure original exception; configured structured logging removes private messages
   * @param recorded whether persistence accepted the failure transition
   */
  public void failed(Job job, Exception failure, boolean recorded) {
    metrics.counter("blockout.jobs.executions", "outcome", "failed").increment();
    attempt(LOG.atError(), "worker.job.failed", job)
        .addKeyValue("failure_recorded", recorded)
        .addKeyValue("retry_exhausted", job.attempts() >= job.maxAttempts())
        .setCause(failure)
        .log("Job execution failed; lease and retry policy apply");
  }

  /**
   * Reports that an attempt can no longer renew or acknowledge its work.
   *
   * @param job attempt whose lease is no longer live
   */
  public void leaseLost(Job job) {
    attempt(LOG.atWarn(), "worker.job.lease_lost", job).log("Attempt no longer owns its lease");
  }

  /**
   * Counts and logs a scheduler-enforced execution deadline.
   *
   * @param job attempt cancelled at its deadline
   */
  public void timedOut(Job job) {
    metrics.counter("blockout.jobs.timeouts").increment();
    attempt(LOG.atWarn(), "worker.job.deadline", job).log("Execution deadline reached");
  }

  /**
   * Adds only bounded technical attempt context to an operational event.
   *
   * @param event SLF4J event at the selected severity
   * @param name stable event action
   * @param job source of technical ID, attempt and payload version
   * @return the enriched builder; payload, key and lease token are excluded
   */
  private LoggingEventBuilder attempt(LoggingEventBuilder event, String name, Job job) {
    return event
        .addKeyValue("event.action", name)
        .addKeyValue("job_id", job.id())
        .addKeyValue("attempt", job.attempts())
        .addKeyValue("payload_version", job.version());
  }
}
