package com.blockout.collector.acquisition.lnv;

import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/** Reads published logos with the shared LNV budget and native bounded in-memory cache. */
@Component
public class LnvTeamImages {
  private final ProviderHttpClient http;
  private final Clock clock;

  /** Original bounded bytes and their actual supplier-read time, never a cache-hit timestamp. */
  public record Image(byte[] bytes, Instant observedAt) {}

  /**
   * Binds the existing provider budget; no independent image scheduler is introduced.
   *
   * @param http shared LNV HTTP and image cache
   * @param clock actual source-read completion time
   */
  public LnvTeamImages(@Qualifier("lnvProviderClient") ProviderHttpClient http, Clock clock) {
    this.http = http;
    this.clock = clock;
  }

  /**
   * Returns bytes only for a new supplier response; the passage deduplicates native team IDs.
   *
   * @param uri qualified published image reference
   * @return new observation or null on native cache reuse
   */
  public Image read(URI uri) {
    ProviderHttpClient.Response response = http.image(uri).join();
    return response.supplierRead() ? new Image(response.body(), clock.instant()) : null;
  }
}
