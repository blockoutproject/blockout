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
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.service.CalendarAcceptanceService;
import com.blockout.backend.sporting.application.service.CatalogAcceptanceService;
import com.blockout.backend.sporting.application.service.ClubDetailsService;
import com.blockout.backend.sporting.application.service.ClubLocalityService;
import com.blockout.backend.sporting.application.service.MatchAcceptanceService;
import com.blockout.backend.sporting.application.service.SportingImageService;
import com.blockout.backend.sporting.application.service.StandingsService;
import java.io.IOException;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Generated ingestion routes delegating to fenced owner acceptance transactions. */
@RestController
@RequiredArgsConstructor
public class SportingIngestionController implements SportingApi {
  private final MatchAcceptanceService matches;
  private final CalendarAcceptanceService calendars;
  private final CatalogAcceptanceService catalogs;
  private final StandingsService standings;
  private final SportingObservationMapper mapper;
  private final SportingObservationValidator validator;
  private final ClubDetailsService clubs;
  private final ClubLocalityService localities;
  private final SportingImageService images;
  private final SportingPresentationMapper presentationMapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ObservationOutcomeInternalResponse> observeClubDetails(
      UUID clubId, ClubDetailsInternalRequest request) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(clubs.accept(clubId, presentationMapper.toObservation(request))));
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
        new MatchObservation.Context(cycleId, readOrdinal, observedAt, providerPublishedAt);
    images.requireSource(teamId, context);
    Image validated;
    try (InputStream content = body.getInputStream()) {
      byte[] bytes = content.readNBytes(SportingImageService.MAX_BYTES + 1);
      if (bytes.length > SportingImageService.MAX_BYTES)
        throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE);
      validated = SportingImageService.validate(bytes);
    } catch (IOException invalid) {
      throw new SportingValidationException();
    }
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
