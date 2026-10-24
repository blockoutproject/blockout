package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.ProcessDueLinkAnnouncements;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/** Native minute eligibility pass; external push and exact-start timers are separate concerns. */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@RequiredArgsConstructor
public class LinkAnnouncementSchedule {
  private final ProcessDueLinkAnnouncements pass;

  /** Executes the ordinary pass; Spring's disabled cron value supports isolated test contexts. */
  @Scheduled(cron = "${blockout.notifications.link-announcements-cron:0 * * * * *}")
  public void process() {
    pass.run();
  }
}
