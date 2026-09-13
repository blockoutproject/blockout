package com.blockout.backend.worker.config;

import com.blockout.backend.jobs.application.JobHandler;
import com.blockout.backend.jobs.application.JobRepository;
import com.blockout.backend.worker.application.JobExecutionService;
import com.blockout.backend.worker.application.WorkerTelemetry;
import com.blockout.backend.worker.infrastructure.scheduling.JobWorker;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Wires worker execution, scheduling and telemetry through public queue and health boundaries. */
@Configuration(proxyBeanMethods = false)
public class WorkerConfiguration {
  /**
   * Creates the single worker diagnostic owner.
   *
   * @param jobs queue metric reads
   * @param registry application metrics registry
   * @return worker transition logging and counters
   */
  @Bean
  WorkerTelemetry workerTelemetry(JobRepository jobs, MeterRegistry registry) {
    return new WorkerTelemetry(jobs, registry);
  }

  /**
   * Wires handler dispatch and fenced acknowledgement.
   *
   * @param jobs queue transition port
   * @param handlers registered owner handlers
   * @param telemetry worker diagnostic owner
   * @return the attempt execution service
   */
  @Bean
  JobExecutionService jobExecutionService(
      JobRepository jobs, List<JobHandler> handlers, WorkerTelemetry telemetry) {
    return new JobExecutionService(jobs, handlers, telemetry);
  }

  /**
   * Creates the Spring-managed scheduler with a qualified operations-schema gate.
   *
   * @param jobs claim and renewal port
   * @param props validated capacity and timing
   * @param attempts handler execution and acknowledgement owner
   * @param telemetry worker readiness and transition diagnostics
   * @param schema operations readiness through the standard Spring health interface
   * @return the single-start lifecycle-managed scheduler
   */
  @Bean
  JobWorker jobWorker(
      JobRepository jobs,
      WorkerProperties props,
      JobExecutionService attempts,
      WorkerTelemetry telemetry,
      @Qualifier("schemaHealthIndicator") HealthIndicator schema) {
    return new JobWorker(jobs, props, attempts, telemetry, schema);
  }
}
