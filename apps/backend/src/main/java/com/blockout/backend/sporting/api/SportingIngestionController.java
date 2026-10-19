package com.blockout.backend.sporting.api;

import com.blockout.backend.generated.ingestion.api.SportingApi;
import com.blockout.backend.generated.ingestion.model.CalendarObservationInternalRequest;
import com.blockout.backend.generated.ingestion.model.CalendarOutcomeInternalResponse;
import com.blockout.backend.generated.ingestion.model.CatalogObservationInternalRequest;
import com.blockout.backend.generated.ingestion.model.CatalogOutcomeInternalResponse;
import com.blockout.backend.generated.ingestion.model.ClubDetailsInternalRequest;
import com.blockout.backend.generated.ingestion.model.ClubLocalityObservationInternalRequest;
import com.blockout.backend.generated.ingestion.model.MatchDetailObservationInternalRequest;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeInternalResponse;
import com.blockout.backend.generated.ingestion.model.StandingsObservationInternalRequest;
import com.blockout.backend.sporting.application.service.CalendarAcceptanceService;
import com.blockout.backend.sporting.application.service.CatalogAcceptanceService;
import com.blockout.backend.sporting.application.service.MatchAcceptanceService;
import com.blockout.backend.sporting.application.service.StandingsService;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Generated ingestion routes; owning application acceptance is wired by this increment. */
@RestController
@RequiredArgsConstructor
public class SportingIngestionController implements SportingApi {
  private final MatchAcceptanceService matches;
  private final CalendarAcceptanceService calendars;
  private final CatalogAcceptanceService catalogs;
  private final StandingsService standings;
  private final SportingObservationMapper mapper;
  private final SportingObservationValidator validator;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ObservationOutcomeInternalResponse> observeClubDetails(
      UUID clubId, ClubDetailsInternalRequest clubDetailsInternalRequest) {
    throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ObservationOutcomeInternalResponse> observeClubLocality(
      UUID clubId, ClubLocalityObservationInternalRequest clubLocalityObservationInternalRequest) {
    throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ObservationOutcomeInternalResponse> observeMatchDetail(
      UUID matchId, MatchDetailObservationInternalRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(matches.detail(mapper.toObservation(matchId, request))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CalendarOutcomeInternalResponse> observePoolCalendar(
      UUID poolId, CalendarObservationInternalRequest request) {
    validator.calendar(request);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(calendars.accept(poolId, mapper.toObservation(request))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ObservationOutcomeInternalResponse> observePoolStandings(
      UUID poolId, StandingsObservationInternalRequest request) {
    validator.standings(request);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(standings.accept(poolId, mapper.toObservation(request))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ObservationOutcomeInternalResponse> observeProfessionalTeamLogo(
      UUID teamId,
      UUID cycleId,
      Long readOrdinal,
      OffsetDateTime observedAt,
      Resource body,
      OffsetDateTime providerPublishedAt) {
    throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<CatalogOutcomeInternalResponse> observeSportingCatalog(
      UUID sourceBindingId, CatalogObservationInternalRequest request) {
    validator.catalog(request);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(catalogs.accept(sourceBindingId, mapper.toObservation(request))));
  }
}
