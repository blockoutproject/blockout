package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.DeliverPush;
import com.blockout.backend.notifications.application.PushProvider;
import com.blockout.backend.notifications.application.PushSubscriptionStore;
import com.blockout.backend.notifications.application.ReadPushEligibility;
import com.blockout.backend.notifications.application.SportingPushAdmission;
import java.time.Clock;
import lombok.extern.slf4j.Slf4j;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.HttpClientSettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/** Native Spring bounded executor and volatile delayed receipt scheduling for one Expo project. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(PushProperties.class)
@Slf4j
public class PushDeliveryConfiguration {
  /**
   * Creates one worker and 100 queued batches; shutdown interrupts/discards transient work.
   *
   * @return native abort-on-overload executor; never a caller-runs fallback
   */
  @Bean(defaultCandidate = false)
  ThreadPoolTaskExecutor pushExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(1);
    executor.setMaxPoolSize(1);
    executor.setQueueCapacity(100);
    executor.setThreadNamePrefix("sporting-push-");
    executor.setWaitForTasksToCompleteOnShutdown(false);
    return executor;
  }

  /**
   * Creates the ordinary scheduler; DeliverPush caps retained callbacks before scheduling.
   *
   * @return process-local scheduler whose callbacks disappear on shutdown/restart
   */
  @Bean(defaultCandidate = false)
  ThreadPoolTaskScheduler pushReceiptScheduler() {
    ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
    scheduler.setPoolSize(1);
    scheduler.setThreadNamePrefix("push-receipt-");
    scheduler.setExecuteExistingDelayedTasksAfterShutdownPolicy(false);
    scheduler.setWaitForTasksToCompleteOnShutdown(false);
    return scheduler;
  }

  /**
   * Owns the Expo transport pool with configured deadlines/redirects and no native replay.
   *
   * @param settings native Boot HTTP settings from application.yaml
   * @return request factory closed by Spring with this context
   */
  @Bean(defaultCandidate = false)
  HttpComponentsClientHttpRequestFactory pushRequestFactory(HttpClientSettings settings) {
    return ClientHttpRequestFactoryBuilder.httpComponents()
        .withHttpClientCustomizer(HttpClientBuilder::disableAutomaticRetries)
        .build(settings);
  }

  /**
   * Uses Boot's ordinary configured connect/read bounds (3/5 seconds), with no redirects/resends.
   *
   * @param builder Boot-configured bounded HTTP client builder
   * @param properties environment input; no provider operation is performed at startup
   * @param json native application JSON mapper
   * @param factory dedicated native Expo transport
   * @return focused official Expo send/receipt adapter
   */
  @Bean
  PushProvider expoPushClient(
      RestClient.Builder builder,
      PushProperties properties,
      JsonMapper json,
      @Qualifier("pushRequestFactory") ClientHttpRequestFactory factory) {
    RestClient.Builder configured =
        builder.requestFactory(factory).baseUrl("https://exp.host/--/api/v2/push");
    if (properties.enabled())
      configured.defaultHeaders(headers -> headers.setBearerAuth(properties.accessToken()));
    log.atInfo()
        .addKeyValue("operation", "sporting_push_configuration")
        .addKeyValue("provider", "expo")
        .addKeyValue("outcome", properties.enabled() ? "enabled" : "disabled")
        .log("Push configuration loaded; provider activation remains environment-owned");
    return new ExpoPushClient(configured.build(), json);
  }

  /**
   * Wires the real current-owner checks and transport, independently of inbox commitment.
   *
   * @param eligibility current F07/F05/F06/F03/F08 reads
   * @param subscriptions exact conditional invalidation owner
   * @param admission F12 current maintenance, including operator recipients
   * @param provider actual HTTP adapter
   * @param executor bounded single-project worker
   * @param scheduler volatile single receipt observation
   * @param clock application time for the delayed observation
   * @param properties explicit environment transport activation
   * @return after-commit event consumer, without a durable queue
   */
  @Bean
  DeliverPush deliverPush(
      ReadPushEligibility eligibility,
      PushSubscriptionStore subscriptions,
      SportingPushAdmission admission,
      PushProvider provider,
      @Qualifier("pushExecutor") ThreadPoolTaskExecutor executor,
      @Qualifier("pushReceiptScheduler") ThreadPoolTaskScheduler scheduler,
      Clock clock,
      PushProperties properties) {
    return new DeliverPush(
        eligibility,
        subscriptions,
        admission,
        provider,
        executor,
        scheduler,
        clock,
        properties.enabled());
  }
}
