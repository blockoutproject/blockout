package com.blockout.backend.notifications.infrastructure;

import com.blockout.backend.notifications.application.DeliverPush;
import com.blockout.backend.notifications.application.PushProvider;
import com.blockout.backend.notifications.application.PushSubscriptionStore;
import com.blockout.backend.notifications.application.ReadPushEligibility;
import com.blockout.backend.notifications.application.SportingPushAdmission;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.niamedtech.expo.exposerversdk.ExpoPushNotificationClient;
import com.niamedtech.expo.exposerversdk.util.ObjectMapperFactory;
import java.time.Clock;
import lombok.extern.slf4j.Slf4j;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.http.client.HttpClientSettings;
import org.springframework.boot.http.client.HttpComponentsHttpClientBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

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
   * Uses Spring Boot's native HTTP builder; the SDK owns status decoding and refusal semantics.
   * Automatic retries stay disabled for the detached POST operation.
   *
   * @param settings configured HTTP bounds and redirect policy from application.yaml
   * @return SDK-supported client, closed by Spring with this context
   */
  @Bean(defaultCandidate = false)
  CloseableHttpClient pushHttpClient(HttpClientSettings settings) {
    return new HttpComponentsHttpClientBuilder()
        .withCustomizer(builder -> builder.disableAutomaticRetries())
        .build(settings);
  }

  /**
   * Builds the Java SDK referenced by Expo, using its public client/token configuration.
   *
   * @param httpClient dedicated bounded native client with automatic retries disabled
   * @param properties explicit environment/project configuration
   * @return upstream SDK; no provider operation is performed at startup
   */
  @Bean
  ExpoPushNotificationClient expoPushSdkClient(
      @Qualifier("pushHttpClient") CloseableHttpClient httpClient, PushProperties properties) {
    ExpoPushNotificationClient.Builder builder = expoPushSdkBuilder(httpClient, properties);
    log.atInfo()
        .addKeyValue("operation", "sporting_push_configuration")
        .addKeyValue("provider", "expo")
        .addKeyValue("outcome", properties.enabled() ? "enabled" : "disabled")
        .log("Push configuration loaded; provider activation remains environment-owned");
    return builder.build();
  }

  /**
   * Configures the SDK once at application startup through its public mapper and builder. The
   * declared native UNKNOWN receipt error preserves other valid outcomes in mixed responses.
   *
   * @param httpClient native bounded transport owned by this application context
   * @param properties environment access-token configuration
   * @return configured SDK builder; the caller completes construction
   */
  ExpoPushNotificationClient.Builder expoPushSdkBuilder(
      CloseableHttpClient httpClient, PushProperties properties) {
    // The SDK declares UNKNOWN for receipt errors but leaves its native fallback disabled.
    ObjectMapperFactory.getInstance()
        .enable(DeserializationFeature.READ_UNKNOWN_ENUM_VALUES_USING_DEFAULT_VALUE);
    ExpoPushNotificationClient.Builder builder =
        ExpoPushNotificationClient.builder()
            .setHttpClient(httpClient)
            .setBaseUri("https://exp.host/--/api/v2");
    if (properties.enabled()) builder.setAccessToken(properties.accessToken());
    return builder;
  }

  /**
   * Keeps F07 mapping and provider limits outside the SDK without copying its protocol models.
   *
   * @param client native Expo-listed Java SDK
   * @param mapper generated mechanical mapping to the SDK's native request type
   * @return focused F07 provider adapter
   */
  @Bean
  PushProvider expoPushClient(ExpoPushNotificationClient client, ExpoPushMapper mapper) {
    return new ExpoPushClient(client, mapper);
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
