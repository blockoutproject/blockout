package com.blockout.collector.acquisition.infrastructure;

import com.blockout.collector.acquisition.application.CollectorLifecycle;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Confirms the single startup through the backend before scheduled acquisition can be enabled. */
@Component
@RequiredArgsConstructor
public class CollectorStartup implements ApplicationRunner {
  private final CollectorLifecycle lifecycle;

  /** {@inheritDoc} */
  @Override
  public void run(ApplicationArguments arguments) {
    lifecycle.start();
  }
}
