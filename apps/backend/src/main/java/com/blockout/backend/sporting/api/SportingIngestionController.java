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
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.service.AcceptCalendar;
import com.blockout.backend.sporting.application.service.AcceptCatalog;
import com.blockout.backend.sporting.application.service.AcceptClubDetails;
import com.blockout.backend.sporting.application.service.AcceptClubLocality;
import com.blockout.backend.sporting.application.service.AcceptMatchObservation;
import com.blockout.backend.sporting.application.service.AcceptSourceImage;
import com.blockout.backend.sporting.application.service.AcceptStandings;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Generated ingestion routes delegating to fenced owner acceptance transactions. */
@RestController
@RequiredArgsConstructor
public class SportingIngestionController implements SportingApi {
  private final AcceptMatchObservation matches;
  private final AcceptCalendar calendars;
  private final AcceptCatalog catalogs;
  private final AcceptStandings standings;
  private final SportingObservationMapper mapper;
  private final SportingObservationValidator validator;
  private final AcceptClubDetails clubObservations;
  private final AcceptClubLocality localities;
  private final AcceptSourceImage images;
  private final SportingPresentationValidator imageParts;
  private final SportingPresentationMapper presentationMapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ObservationOutcomeInternalResponse> observeClubDetails(
      UUID clubId, ClubDetailsInternalRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                clubObservations.accept(clubId, presentationMapper.toObservation(request))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ObservationOutcomeInternalResponse> observeClubLocality(
      UUID clubId, ClubLocalityObservationInternalRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(localities.accept(clubId, presentationMapper.toObservation(request))));
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
    MatchObservation.Context context =
        mapper.toContext(cycleId, readOrdinal, observedAt, providerPublishedAt);
    images.requireSource(teamId, context);
    Image validated = imageParts.validateImage(body);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(images.acceptSource(teamId, context, validated)));
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
