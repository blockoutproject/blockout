package com.blockout.backend.sporting.api;

import com.blockout.backend.generated.mobile.api.ConsultationApi;
import com.blockout.backend.generated.mobile.model.ClubDetailResponse;
import com.blockout.backend.generated.mobile.model.ClubTeamsResponse;
import com.blockout.backend.generated.mobile.model.MatchDetailResponse;
import com.blockout.backend.generated.mobile.model.PoolDetailResponse;
import com.blockout.backend.generated.mobile.model.TeamDetailResponse;
import com.blockout.backend.generated.mobile.model.TeamLogoSelectionEnum;
import com.blockout.backend.sporting.application.ConsultationReadPort.ClubSeasonRequest;
import com.blockout.backend.sporting.application.ReadSportingResources;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public resource and binary image delivery through generated canonical routes and F12 admission.
 */
@RestController
@RequiredArgsConstructor
public class ConsultationController implements ConsultationApi {
  private final ReadSportingResources resources;
  private final ConsultationApiMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ClubDetailResponse> getClub(UUID clubId, Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toResponse(resources.club(clubId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<TeamDetailResponse> getTeam(UUID teamId, Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toResponse(resources.team(teamId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<PoolDetailResponse> getPool(UUID poolId, Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toResponse(resources.pool(poolId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<MatchDetailResponse> getMatch(UUID matchId, Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toResponse(resources.match(matchId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ClubTeamsResponse> listClubTeams(
      UUID clubId, UUID seasonId, Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toResponse(resources.clubTeams(new ClubSeasonRequest(clubId, seasonId))));
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
