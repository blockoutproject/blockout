package com.blockout.backend.api.user.api;

import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Only configured native public clients can bootstrap personal profiles. */
@ConfigurationProperties("blockout.identity")
public record NativeUserProperties(Set<String> nativeClientIds) {
  public NativeUserProperties {
    if (nativeClientIds == null
        || nativeClientIds.isEmpty()
        || nativeClientIds.stream().anyMatch(x -> x == null || x.isBlank()))
      throw new IllegalArgumentException("Native client allowlist is required");
    nativeClientIds = Set.copyOf(nativeClientIds);
  }
}
