package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.PurgeNotifications;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/** Native daily UTC scheduling; no retry timer or maintenance-dependent suspension. */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@RequiredArgsConstructor
public class NotificationRetentionConfiguration {
  private final PurgeNotifications purge;

  /** Runs retention on the ordinary daily trigger, including after a previous failed pass. */
  @Scheduled(cron = "${blockout.notifications.retention-cron}", zone = "UTC")
  public void purge() {
    purge.run();
  }
}
