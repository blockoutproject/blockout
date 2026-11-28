package com.blockout.backend.legacy.api;

import com.blockout.backend.generated.legacymobile.api.LegacyApplicationAccessApi;
import com.blockout.backend.generated.legacymobile.model.LegacyApplicationStatusResponse;
import com.blockout.backend.legacy.infrastructure.LegacyRetirementProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Serves only the frozen update read; it restores no old business endpoint or permission. */
@RestController
@RequiredArgsConstructor
@EnableConfigurationProperties(LegacyRetirementProperties.class)
public class LegacyApplicationStatusController implements LegacyApplicationAccessApi {
  private final LegacyRetirementProperties properties;
  private final LegacyApplicationStatusMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<LegacyApplicationStatusResponse> getLegacyApplicationStatus() {
    if (!properties.isConfigured()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(mapper.toDto(properties));
  }
}
