package com.blockout.backend.worker.infrastructure.scheduling;

import com.blockout.backend.jobs.application.Job;
import com.blockout.backend.jobs.application.JobRepository;
import com.blockout.backend.jobs.infrastructure.health.SchemaHealthIndicator;
import com.blockout.backend.worker.application.JobExecutionService;
import com.blockout.backend.worker.application.WorkerTelemetry;
import com.blockout.backend.worker.config.WorkerProperties;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.boot.health.contributor.Status;
import org.springframework.context.SmartLifecycle;

/**
 * Bounded, single-start dispatcher with independent lease polling and execution deadlines. Attempts
 * stay counted until the handler actually exits, including when it ignores cancellation; otherwise
 * an expired job could spawn unlimited overlapping executions. Cancellation cannot undo an external
 * effect. Shutdown stops claims, waits the configured grace, then interrupts remaining attempts.
 */
public final class JobWorker implements SmartLifecycle, HealthIndicator {
  private final SchemaHealthIndicator schema;
  private final JobRepository jobs;
  private final WorkerProperties config;
  private final JobExecutionService attempts;
  private final WorkerTelemetry telemetry;
  private final ScheduledExecutorService control = Executors.newSingleThreadScheduledExecutor();
  // A blocked database poll must never prevent interruption at the execution deadline.
  private final ScheduledThreadPoolExecutor deadlines = new ScheduledThreadPoolExecutor(1);
  private final ExecutorService execution;
  private final Map<UUID, Execution> active = new ConcurrentHashMap<>();
  private volatile boolean running;
  private volatile long lastPoll;
  private long lastCleanup;

  private record Execution(
      Job job, FutureTask<Void> task, AtomicBoolean cancelled, AtomicLong renewed) {}

  public JobWorker(
      JobRepository jobs,
      WorkerProperties config,
      JobExecutionService attempts,
      WorkerTelemetry telemetry,
      SchemaHealthIndicator schema) {
    this.schema = schema;
    this.jobs = jobs;
    this.config = config;
    this.attempts = attempts;
    this.telemetry = telemetry;
    telemetry.readiness(this, w -> Status.UP.equals(w.health().getStatus()) ? 1 : 0);
    deadlines.setRemoveOnCancelPolicy(true);
    execution =
        new ThreadPoolExecutor(
            config.concurrency(),
            config.concurrency(),
            0L,
            TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(config.concurrency()));
  }

  @Override
  public synchronized void start() {
    if (running) return;
    if (control.isShutdown()) throw new IllegalStateException("A stopped worker cannot restart");
    running = true;
    telemetry.started(config.concurrency());
    lastPoll = System.nanoTime();
    control.scheduleWithFixedDelay(this::tick, 0, config.poll().toMillis(), TimeUnit.MILLISECONDS);
  }

  void tick() {
    if (!running) return;
    try {
      long now = System.nanoTime();
      if (!Status.UP.equals(schema.health().getStatus())) {
        telemetry.pollUnavailable(null);
        return;
      }
      for (Execution work : active.values()) {
        if (work.cancelled().get()) continue;
        if (now - work.renewed().get() >= config.renewal().toNanos()) {
          if (!jobs.renew(work.job(), config.lease())) {
            cancel(work);
            telemetry.leaseLost(work.job());
          } else work.renewed().set(now);
        }
      }
      int remaining = config.concurrency() - active.size();
      while (running && remaining-- > 0) {
        Optional<Job> job = jobs.claim(config.lease());
        if (job.isEmpty()) break;
        dispatch(job.get());
      }
      if (now - lastCleanup >= Duration.ofMinutes(1).toNanos()) {
        jobs.cleanup();
        lastCleanup = now;
      }
      lastPoll = System.nanoTime();
      telemetry.pollRecovered();
    } catch (RuntimeException error) {
      telemetry.pollUnavailable(error);
    }
  }

  private void dispatch(Job job) {
    long now = System.nanoTime();
    AtomicBoolean cancelled = new AtomicBoolean();
    var timeout = new AtomicReference<ScheduledFuture<?>>();
    FutureTask<Void> task =
        new FutureTask<>(
            () -> {
              attempts.execute(job, cancelled);
              return null;
            }) {
          @Override
          public void run() {
            try {
              super.run();
            } finally {
              // Future.done() also runs on cancellation, before an uncooperative handler exits.
              active.remove(job.leaseToken());
              var scheduled = timeout.get();
              if (scheduled != null) scheduled.cancel(false);
            }
          }
        };
    var work = new Execution(job, task, cancelled, new AtomicLong(now));
    active.put(job.leaseToken(), work);
    try {
      timeout.set(
          deadlines.schedule(
              () -> {
                if (!task.isDone()) {
                  cancel(work);
                  telemetry.timedOut(job);
                }
              },
              config.deadline().toMillis(),
              TimeUnit.MILLISECONDS));
      // A bounded handoff absorbs the gap between Runnable completion and an idle pool thread.
      execution.execute(task);
    } catch (RejectedExecutionException stopped) {
      cancel(work);
      active.remove(job.leaseToken());
      var scheduled = timeout.get();
      if (scheduled != null) scheduled.cancel(false);
    }
  }

  private void cancel(Execution work) {
    work.cancelled().set(true);
    work.task().cancel(true);
  }

  @Override
  public synchronized void stop() {
    if (!running) return;
    running = false;
    control.shutdown();
    execution.shutdown();
    try {
      if (!execution.awaitTermination(config.shutdownGrace().toMillis(), TimeUnit.MILLISECONDS))
        active.values().forEach(this::cancel);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      active.values().forEach(this::cancel);
    } finally {
      control.shutdownNow();
      deadlines.shutdownNow();
      execution.shutdownNow();
      telemetry.stopped(active.size());
    }
  }

  @Override
  public boolean isRunning() {
    return running;
  }

  @Override
  public Health health() {
    return running
            && System.nanoTime() - lastPoll
                < Math.max(Duration.ofSeconds(15).toNanos(), config.poll().toNanos() * 3)
        ? Health.up().build()
        : Health.down().build();
  }
}
