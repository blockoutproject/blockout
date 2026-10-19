package com.blockout.collector.acquisition.ffvb;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.FfvbAcquisition;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import java.net.URI;
import java.net.URISyntaxException;
import org.apache.hc.core5.net.URIBuilder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/** Uses the shared bounded HTTP client; jsoup never performs a separate network request. */
@Component
public class FfvbObservationReader implements FfvbAcquisition {
  private final ProviderHttpClient http;
  private final FfvbCalendarParser calendars;
  private final FfvbStandingsParser standings;

  /**
   * Binds the FFVB budget and its two independent interpreters.
   *
   * @param http explicit FFVB transport
   * @param calendars CSV interpreter
   * @param standings official table interpreter
   */
  public FfvbObservationReader(
      @Qualifier("ffvbProviderClient") ProviderHttpClient http,
      FfvbCalendarParser calendars,
      FfvbStandingsParser standings) {
    this.http = http;
    this.calendars = calendars;
    this.standings = standings;
  }

  /** {@inheritDoc} */
  @Override
  public SportingObservation.Calendar calendar(CollectionBackend.Target target) {
    FfvbPage page = read(target);
    return calendars.parse(
        http.post(page.exportUrl(), page.exportFields()).join(), page, scope(target));
  }

  /** {@inheritDoc} */
  @Override
  public SportingObservation.Standings standings(CollectionBackend.Target target) {
    return standings.parse(read(target));
  }

  /**
   * Reads and qualifies the full contextual calendar through the bounded client.
   *
   * @param target exact admitted reference
   * @return positively qualified complete HTML context
   */
  private FfvbPage read(CollectionBackend.Target target) {
    try {
      URI url = new URIBuilder(target.url()).setParameter("calend", "COMPLET").build();
      return new FfvbPage(http.get(url).join(), url, scope(target));
    } catch (URISyntaxException invalid) {
      throw new FfvbAcquisitionException("Invalid FFVB acquisition URL");
    }
  }

  /**
   * Projects the backend-qualified native identity without guessing group membership.
   *
   * @param target backend-qualified context
   * @return exact native scope without inferred grouping
   */
  private FfvbScope scope(CollectionBackend.Target target) {
    return new FfvbScope(
        target.seasonLabel(),
        target.organizerReference(),
        target.competitionReference(),
        target.poolReference(),
        target.tourReference(),
        target.groupReference());
  }
}
