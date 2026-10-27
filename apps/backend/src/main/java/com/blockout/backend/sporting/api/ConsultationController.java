package com.blockout.backend.sporting.api;

import com.blockout.backend.generated.mobile.api.ConsultationApi;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.generated.mobile.model.ClubDetailResponse;
import com.blockout.backend.generated.mobile.model.ClubTeamsResponse;
import com.blockout.backend.generated.mobile.model.MatchCalendarResponse;
import com.blockout.backend.generated.mobile.model.MatchDetailResponse;
import com.blockout.backend.generated.mobile.model.PoolDetailResponse;
import com.blockout.backend.generated.mobile.model.TeamDetailResponse;
import com.blockout.backend.generated.mobile.model.TeamLogoSelectionEnum;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarRequest;
import com.blockout.backend.sporting.application.ConsultationRequest.ClubSeasonRequest;
import com.blockout.backend.sporting.application.ReadMatchCalendar;
import com.blockout.backend.sporting.application.ReadSportingResources;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.format.Formatter;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.InitBinder;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Public resource and binary image delivery through generated canonical routes and F12 admission.
 */
@RestController
@RequiredArgsConstructor
public class ConsultationController implements ConsultationApi {
  private final ReadSportingResources resources;
  private final ConsultationApiMapper mapper;
  private final ReadMatchCalendar calendars;

  /**
   * Keeps calendar input strict even when another generated consumer registers a global enum
   * converter.
   *
   * @param binder native controller-scoped request binding
   */
  @InitBinder
  void calendarCategory(WebDataBinder binder) {
    binder.addCustomFormatter(
        new Formatter<CalendarCategoryEnum>() {
          /** {@inheritDoc} */
          @Override
          public CalendarCategoryEnum parse(String text, Locale locale) {
            return switch (text) {
              case "upcoming" -> CalendarCategoryEnum.UPCOMING;
              case "completed" -> CalendarCategoryEnum.COMPLETED;
              default -> throw new IllegalArgumentException("Unknown calendar category");
            };
          }

          /** {@inheritDoc} */
          @Override
          public String print(CalendarCategoryEnum value, Locale locale) {
            return value.getValue();
          }
        });
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<MatchCalendarResponse> listMatches(
      CalendarCategoryEnum category,
      String timeZone,
      UUID clubId,
      UUID teamId,
      UUID poolId,
      UUID seasonId,
      LocalDate nextDay,
      Boolean bypass) {
    if (Stream.of(clubId, teamId, poolId).filter(java.util.Objects::nonNull).count() != 1
        || (clubId != null) != (seasonId != null))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    if (!ZoneId.getAvailableZoneIds().contains(timeZone))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
    Kind kind = clubId != null ? Kind.CLUB : teamId != null ? Kind.TEAM : Kind.POOL;
    UUID id = clubId != null ? clubId : teamId != null ? teamId : poolId;
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                calendars.read(
                    new CalendarRequest(
                        kind, id, seasonId, category, ZoneId.of(timeZone), nextDay))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ClubDetailResponse> getClub(UUID clubId, Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(resources.club(clubId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<TeamDetailResponse> getTeam(UUID teamId, Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(resources.team(teamId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<PoolDetailResponse> getPool(UUID poolId, Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(resources.pool(poolId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<MatchDetailResponse> getMatch(UUID matchId, Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(resources.match(matchId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ClubTeamsResponse> listClubTeams(
      UUID clubId, UUID seasonId, Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(resources.clubTeams(new ClubSeasonRequest(clubId, seasonId))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<Resource> getClubLogo(UUID clubId, Boolean bypass) {
    return image(resources.clubLogo(clubId));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<Resource> getDivisionLogo(UUID divisionId, Boolean bypass) {
    return image(resources.divisionLogo(divisionId));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<Resource> getTeamLogo(
      UUID teamId, TeamLogoSelectionEnum selection, Boolean bypass) {
    return image(resources.teamLogo(teamId, selection));
  }

  /**
   * Delivers validated owner bytes with their actual PNG/JPEG media type and no HTTP retention.
   *
   * @param image currently authorized owner image
   * @return binary body without JSON adaptation
   */
  private ResponseEntity<Resource> image(Image image) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .contentType(MediaType.parseMediaType(image.mediaType()))
        .body(new ByteArrayResource(image.bytes()));
  }
}
