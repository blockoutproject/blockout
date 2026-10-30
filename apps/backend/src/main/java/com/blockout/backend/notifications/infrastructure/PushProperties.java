package com.blockout.backend.notifications.infrastructure;

import jakarta.validation.constraints.AssertTrue;
import java.util.UUID;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * One environment/project per sender; activation and private credentials need separate authority.
 *
 * @param enabled opt-in transport, independent from durable inbox processing
 * @param projectId environment's existing Expo project identity
 * @param accessToken private server enhanced-security bearer token; never logged
 */
@Validated
@ConfigurationProperties("blockout.notifications.push")
public record PushProperties(boolean enabled, UUID projectId, String accessToken) {
  /**
   * Rejects activation without the project and server enhanced-security credential.
   *
   * @return whether the disabled or fully configured transport can start
   */
  @AssertTrue(message = "Enabled push requires project-id and a server access-token")
  public boolean isConfigured() {
    return !enabled || (projectId != null && accessToken != null && !accessToken.isBlank());
  }
}
