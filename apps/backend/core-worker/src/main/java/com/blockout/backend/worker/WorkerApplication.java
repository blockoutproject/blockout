package com.blockout.backend.worker;

import com.blockout.backend.jobs.config.JobsConfiguration;
import com.blockout.backend.worker.config.WorkerProperties;
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
}
