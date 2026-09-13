package com.blockout.backend.worker.application;

import com.blockout.backend.jobs.application.Job;
import com.blockout.backend.jobs.application.JobHandler;
import com.blockout.backend.jobs.application.JobRepository;
import com.blockout.backend.jobs.application.JobResult;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/** Resolves one attempt's outcome; the scheduler owns capacity, renewal and interruption. */
public final class JobExecutionService {
  private final JobRepository jobs;
  private final Map<String, JobHandler> handlers;
  private final WorkerTelemetry telemetry;

  /**
   * Registers one handler per durable job type and rejects ambiguous ownership.
   *
   * @param jobs fenced queue persistence
   * @param handlers owner adapters for supported type/version pairs
   * @param telemetry worker-owned transition diagnostics
   * @throws IllegalArgumentException multiple handlers claim the same job type
   */
  public JobExecutionService(
      JobRepository jobs, List<JobHandler> handlers, WorkerTelemetry telemetry) {
    this.jobs = jobs;
    this.telemetry = telemetry;
    Map<String, JobHandler> registered = new HashMap<>();
    for (JobHandler handler : handlers)
      if (registered.put(handler.type(), handler) != null)
        throw new IllegalArgumentException("Duplicate job handler");
    this.handlers = Map.copyOf(registered);
  }

  /**
   * Executes one handler and acknowledges only the still-owned, non-cancelled attempt. Unsupported
   * versions and owner rejections become permanent failures; unexpected failures use bounded
   * retries. Interruption leaves work recoverable and preserves the thread interrupt flag.
   *
   * @param job claimed payload and attempt identity
   * @param cancelled scheduler-owned cancellation flag checked before execution and acknowledgement
   */
  public void execute(Job job, AtomicBoolean cancelled) {
    try {
      if (cancelled.get()) return;
      JobHandler handler = handlers.get(job.type());
      if (handler == null || handler.version() != job.version()) {
        if (jobs.fail(job, FailureCode.UNSUPPORTED_JOB.name(), Duration.ZERO, true))
          telemetry.unsupported(job);
        return;
      }
      JobResult result = handler.handle(job);
      if (cancelled.get()) return;
      switch (result) {
        case JobResult.Rejected rejected -> {
          if (jobs.fail(job, rejected.code(), Duration.ZERO, true))
            telemetry.rejected(job, rejected.code());
        }
        case JobResult.Failed failed -> {
          Duration delay = RetryPolicy.delay(job.attempts());
          if (failed.retryAfter().compareTo(delay) > 0) delay = failed.retryAfter();
          if (!jobs.failWithEffect(job, failed.code(), delay, failed.permanent(), failed.effect()))
            telemetry.leaseLost(job);
        }
        case JobResult.Completed _ -> complete(job, () -> {});
        case JobResult.SqlEffect sql -> complete(job, sql.effect());
      }
    } catch (InterruptedException _) {
      Thread.currentThread().interrupt();
    } catch (RuntimeException failure) {
      boolean recorded = false;
      try {
        if (!cancelled.get())
          recorded =
              jobs.fail(
                  job,
                  FailureCode.HANDLER_FAILURE.name(),
                  RetryPolicy.delay(job.attempts()),
                  false);
      } catch (RuntimeException unavailable) {
        failure.addSuppressed(unavailable);
      }
      telemetry.failed(job, failure, recorded);
    }
  }

  /**
   * Commits SQL effects with the fenced acknowledgement and reports the committed outcome.
   *
   * @param job attempt to acknowledge
   * @param effect SQL-only callback; empty for previously completed external effects
   */
  private void complete(Job job, Runnable effect) {
    if (jobs.completeWithEffect(job, effect)) telemetry.completed();
    else telemetry.leaseLost(job);
  }

  /** Worker-owned failures serialized at the extensible durable-job boundary. */
  private enum FailureCode {
    UNSUPPORTED_JOB,
    HANDLER_FAILURE
  }
}
