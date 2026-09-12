package com.blockout.backend.worker;

import com.blockout.backend.jobs.*;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.context.SmartLifecycle;

/** Bounded dispatcher. Cancelling a call never pretends to undo an external side effect. */
public final class JobWorker implements SmartLifecycle, HealthIndicator {
  private static final Logger LOG = LoggerFactory.getLogger(JobWorker.class);
  private final SchemaHealthIndicator schema;
  private final JobRepository jobs;
  private final WorkerProperties config;
  private final Map<String, JobHandler> handlers;
  private final MeterRegistry metrics;
  private final ScheduledExecutorService control = Executors.newSingleThreadScheduledExecutor();
  private final ScheduledThreadPoolExecutor deadlines = new ScheduledThreadPoolExecutor(1);
  private final ExecutorService execution;
  private final Map<UUID, Execution> active = new ConcurrentHashMap<>();
  private volatile boolean running;
  private volatile long lastPoll;
  private long lastCleanup;

  private record Execution(
      Job job,
      FutureTask<Void> task,
      AtomicBoolean cancelled,
      long[] renewed,
      java.util.concurrent.atomic.AtomicReference<ScheduledFuture<?>> timeout) {}

  public JobWorker(
      JobRepository jobs,
      WorkerProperties config,
      List<JobHandler> handlers,
      MeterRegistry metrics,
      SchemaHealthIndicator schema) {
    this.schema = schema;
    this.jobs = jobs;
    this.config = config;
    this.metrics = metrics;
    Map<String, JobHandler> registered = new HashMap<>();
    for (JobHandler handler : handlers)
      if (registered.put(handler.type(), handler) != null)
        throw new IllegalArgumentException("Duplicate job handler");
    this.handlers = Map.copyOf(registered);
    metrics.gauge(
        "blockout.worker.ready",
        this,
        w ->
            org.springframework.boot.health.contributor.Status.UP.equals(w.health().getStatus())
                ? 1
                : 0);
    deadlines.setRemoveOnCancelPolicy(true);
    execution =
        new ThreadPoolExecutor(
            config.concurrency(),
            config.concurrency(),
            0L,
            TimeUnit.MILLISECONDS,
            new SynchronousQueue<>());
    for (String state : List.of("pending", "running", "succeeded", "dead"))
      metrics.gauge(
          "blockout.jobs.count",
          List.of(io.micrometer.core.instrument.Tag.of("state", state)),
          jobs,
          j -> safeCount(j, state));
    metrics.gauge(
        "blockout.jobs.oldest.available.seconds",
        jobs,
        j -> {
          try {
            return j.oldestAvailableSeconds();
          } catch (RuntimeException e) {
            return Double.NaN;
          }
        });
  }

  private double safeCount(JobRepository repository, String state) {
    try {
      return repository.count(state);
    } catch (RuntimeException e) {
      return Double.NaN;
    }
  }

  @Override
  public void start() {
    running = true;
    lastPoll = System.nanoTime();
    control.scheduleWithFixedDelay(this::tick, 0, config.poll().toMillis(), TimeUnit.MILLISECONDS);
  }

  void tick() {
    if (!running) return;
    try {
      long now = System.nanoTime();
      if (!org.springframework.boot.health.contributor.Status.UP.equals(
          schema.health().getStatus())) return;
      for (Execution work : active.values()) {
        if (work.cancelled().get()) continue;
        if (now - work.renewed()[0] >= config.renewal().toNanos()) {
          if (!jobs.renew(work.job(), config.lease())) cancel(work);
          else work.renewed()[0] = now;
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
    } catch (RuntimeException error) {
      LOG.warn("Worker poll failed; work remains durable", error);
    }
  }

  private void dispatch(Job job) {
    JobHandler handler = handlers.get(job.type());
    if (handler == null || handler.version() != job.version()) {
      jobs.fail(job, "UNSUPPORTED_JOB", Duration.ZERO, true);
      metrics.counter("blockout.jobs.failed", "reason", "unsupported").increment();
      return;
    }
    long now = System.nanoTime();
    AtomicBoolean cancelled = new AtomicBoolean();
    AtomicBoolean entered = new AtomicBoolean();
    var timeout = new java.util.concurrent.atomic.AtomicReference<ScheduledFuture<?>>();
    FutureTask<Void> task =
        new FutureTask<>(
            () -> {
              entered.set(true);
              try {
                if (cancelled.get()) return null;
                handler.handle(job);
                if (!cancelled.get() && jobs.completeWithEffect(job, () -> {}))
                  metrics.counter("blockout.jobs.executions", "outcome", "completed").increment();
              } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
              } catch (JobRejectedException rejected) {
                if (!cancelled.get()) jobs.fail(job, rejected.code(), Duration.ZERO, true);
                metrics.counter("blockout.jobs.executions", "outcome", "rejected").increment();
              } catch (Exception failure) {
                if (!cancelled.get())
                  jobs.fail(job, "HANDLER_FAILURE", RetryPolicy.delay(job.attempts()), false);
                metrics.counter("blockout.jobs.executions", "outcome", "failed").increment();
                LOG.warn("Job handler failed; retry policy applies");
              } finally {
                active.remove(job.leaseToken());
                var scheduled = timeout.get();
                if (scheduled != null) scheduled.cancel(false);
              }
              return null;
            }) {
          @Override
          protected void done() {
            if (!entered.get()) active.remove(job.leaseToken());
          }
        };
    var work = new Execution(job, task, cancelled, new long[] {now}, timeout);
    active.put(job.leaseToken(), work);
    timeout.set(
        deadlines.schedule(
            () -> {
              if (!task.isDone()) {
                cancel(work);
                metrics.counter("blockout.jobs.timeouts").increment();
              }
            },
            config.deadline().toMillis(),
            TimeUnit.MILLISECONDS));
    try {
      execution.execute(task);
    } catch (RejectedExecutionException stopped) {
      cancel(work);
      timeout.get().cancel(false);
    }
  }

  private void cancel(Execution work) {
    work.cancelled().set(true);
    work.task().cancel(true);
  }

  @Override
  public void stop() {
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
