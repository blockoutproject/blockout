package com.blockout.backend.worker;

import com.blockout.backend.jobs.*;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.List;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;

@SpringBootApplication
@Import(JobsConfiguration.class)
@EnableConfigurationProperties(WorkerProperties.class)
public class WorkerApplication {
  public static void main(String[] args) {
    SpringApplication.run(WorkerApplication.class, args);
  }

  @Bean
  JobWorker jobWorker(
      JobRepository jobs,
      WorkerProperties props,
      List<JobHandler> handlers,
      MeterRegistry registry,
      SchemaHealthIndicator schema) {
    return new JobWorker(jobs, props, handlers, registry, schema);
  }
}
