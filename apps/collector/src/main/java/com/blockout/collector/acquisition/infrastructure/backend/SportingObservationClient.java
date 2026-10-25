package com.blockout.collector.acquisition.infrastructure.backend;

import com.blockout.collector.acquisition.application.SportingBackend;
import com.blockout.collector.acquisition.application.SportingObservation;
import com.blockout.collector.generated.ingestion.api.SportingApi;
import com.blockout.collector.shared.mapping.TemporalMapping;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Component;

/** Seven generated sporting operations with native OAuth, Jackson decoding and no write replay. */
@Component
@RequiredArgsConstructor
public class SportingObservationClient implements SportingBackend {
  private final SportingApi api;
  private final SportingObservationMapper mapper;

  /** {@inheritDoc} */
  @Override
  public SportingObservation.CatalogOutcome catalog(
      UUID id, SportingObservation.Context context, SportingObservation.Catalog observation) {
    return BackendExchange.once(
        () -> mapper.toView(api.observeSportingCatalog(id, mapper.toDto(context, observation))));
  }

  /** {@inheritDoc} */
  @Override
  public SportingObservation.CalendarOutcome calendar(
      UUID id, SportingObservation.Context context, SportingObservation.Calendar observation) {
    return BackendExchange.once(
        () -> mapper.toView(api.observePoolCalendar(id, mapper.toDto(context, observation))));
  }

  /** {@inheritDoc} */
  @Override
  public SportingObservation.Outcome detail(
      UUID id, SportingObservation.Context context, SportingObservation.Facts observation) {
    return BackendExchange.once(
        () -> mapper.toView(api.observeMatchDetail(id, mapper.toDto(context, observation))));
  }

  /** {@inheritDoc} */
  @Override
  public SportingObservation.Outcome standings(
      UUID id, SportingObservation.Context context, SportingObservation.Standings observation) {
    return BackendExchange.once(
        () -> mapper.toView(api.observePoolStandings(id, mapper.toDto(context, observation))));
  }

  /** {@inheritDoc} */
  @Override
  public SportingObservation.Outcome club(
      UUID id, SportingObservation.Context context, SportingObservation.Club observation) {
    return BackendExchange.once(
        () -> mapper.toView(api.observeClubDetails(id, mapper.toDto(context, observation))));
  }

  /** {@inheritDoc} */
  @Override
  public SportingObservation.Outcome locality(
      UUID id, SportingObservation.Context context, SportingObservation.Locality observation) {
    return BackendExchange.once(
        () -> mapper.toView(api.observeClubLocality(id, mapper.toDto(context, observation))));
  }

  /** {@inheritDoc} */
  @Override
  public SportingObservation.Outcome logo(
      UUID id, SportingObservation.Context context, byte[] image) {
    return BackendExchange.once(
        () ->
            mapper.toView(
                api.observeProfessionalTeamLogo(
                    id,
                    context.cycleId(),
                    context.readOrdinal(),
                    TemporalMapping.toDate(context.observedAt()),
                    new ByteArrayResource(image),
                    context.providerPublishedAt() == null
                        ? null
                        : TemporalMapping.toDate(context.providerPublishedAt()))));
  }
}
