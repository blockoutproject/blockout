package com.blockout.collector.acquisition.ffvb;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.acquisition.application.FfvbAcquisition;
import com.blockout.collector.acquisition.application.FfvbAcquisitionException;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.acquisition.infrastructure.provider.ProviderHttpClient;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Clock;
import java.time.Instant;
import java.util.concurrent.CompletionException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.apache.hc.client5.http.HttpResponseException;
import org.apache.hc.core5.net.URIBuilder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/** Uses the shared bounded HTTP client; jsoup never performs a separate network request. */
@Component
public class FfvbObservationReader implements FfvbAcquisition {
  private final ProviderHttpClient http;
  private final FfvbCalendarParser calendars;
  private final FfvbStandingsParser standings;
  private final Clock clock;

  /**
   * Binds the FFVB budget and its two independent interpreters.
   *
   * @param http explicit FFVB transport
   * @param calendars CSV interpreter
   * @param standings official table interpreter
   * @param clock actual provider read completion times
   */
  public FfvbObservationReader(
      @Qualifier("ffvbProviderClient") ProviderHttpClient http,
      FfvbCalendarParser calendars,
      FfvbStandingsParser standings,
      Clock clock) {
    this.http = http;
    this.calendars = calendars;
    this.standings = standings;
    this.clock = clock;
  }

  /** {@inheritDoc} */
  @Override
  public URI resourceUrl(CollectionBackend.Target target) {
    try {
      return new URIBuilder(target.url()).setParameter("calend", "COMPLET").build();
    } catch (URISyntaxException invalid) {
      throw new FfvbAcquisitionException("Invalid FFVB acquisition URL");
    }
  }

  /** {@inheritDoc} */
  @Override
  public Resource read(URI url) {
    try {
      ProviderHttpClient.Response response = http.page(url).join();
      return fromPage(response, clock.instant());
    } catch (RuntimeException failure) {
      throw readFailure(failure);
    }
  }

  /** {@inheritDoc} */
  @Override
  public Resource fromPage(ProviderHttpClient.Response page, Instant observedAt) {
    return new SharedResource(page.url(), new Read<>(page.body(), observedAt));
  }

  /**
   * Keeps at most one bounded HTML body and export for the current resource. Export failure is
   * retained for its other calendar scopes without preventing independent standings interpretation.
   */
  @RequiredArgsConstructor(access = AccessLevel.PRIVATE)
  private final class SharedResource implements Resource {
    private final URI url;
    private final Read<byte[]> html;
    private Read<byte[]> export;
    private RuntimeException exportFailure;

    /** {@inheritDoc} */
    @Override
    public Read<SportingObservation.Calendar> calendar(CollectionBackend.Target target) {
      FfvbPage page = new FfvbPage(html.observation(), url, scope(target));
      if (export == null && exportFailure == null) {
        try {
          byte[] body = http.post(page.exportUrl(), page.exportFields()).join();
          export = new Read<>(body, clock.instant());
        } catch (RuntimeException failure) {
          exportFailure = readFailure(failure);
        }
      }
      if (exportFailure != null) throw exportFailure;
      return new Read<>(
          calendars.parse(export.observation(), page, scope(target)), export.observedAt());
    }

    /** {@inheritDoc} */
    @Override
    public Read<SportingObservation.Standings> standings(CollectionBackend.Target target) {
      FfvbPage page = new FfvbPage(html.observation(), url, scope(target));
      return new Read<>(standings.parse(page), html.observedAt());
    }
  }

  /**
   * Translates native asynchronous HTTP errors without exposing response content or URLs.
   *
   * @param failure failed provider read
   * @return safe status/type diagnostic retaining the internal cause
   */
  private FfvbAcquisitionException readFailure(RuntimeException failure) {
    Throwable cause =
        failure instanceof CompletionException && failure.getCause() != null
            ? failure.getCause()
            : failure;
    String reason =
        cause instanceof HttpResponseException response
            ? "Provider HTTP " + response.getStatusCode()
            : cause.getClass().getSimpleName();
    return new FfvbAcquisitionException(reason, failure);
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
