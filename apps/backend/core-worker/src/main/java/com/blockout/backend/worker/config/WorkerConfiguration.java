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

@Configuration(proxyBeanMethods = false)
public class WorkerConfiguration {
  @Bean
  WorkerTelemetry workerTelemetry(JobRepository jobs, MeterRegistry registry) {
    return new WorkerTelemetry(jobs, registry);
  }

  @Bean
  JobExecutionService jobExecutionService(
      JobRepository jobs, List<JobHandler> handlers, WorkerTelemetry telemetry) {
    return new JobExecutionService(jobs, handlers, telemetry);
  }

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
