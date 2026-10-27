package com.blockout.backend.following.api;

import com.blockout.backend.following.api.FollowingRequest.QueryShape;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.ReadFollowOptions;
import com.blockout.backend.following.application.ReadFollowState;
import com.blockout.backend.following.application.ReplaceFollowState;
import com.blockout.backend.generated.mobile.api.FollowingApi;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.generated.mobile.model.FollowOptionsResponse;
import com.blockout.backend.generated.mobile.model.FollowStateResponse;
import com.blockout.backend.generated.mobile.model.FollowerCountResponse;
import com.blockout.backend.generated.mobile.model.PersonalMatchCalendarResponse;
import com.blockout.backend.generated.mobile.model.PoolFollowsResponse;
import com.blockout.backend.generated.mobile.model.ReplaceFollowStateRequest;
import com.blockout.backend.generated.mobile.model.TeamFollowsResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Canonical following routes; later stories own collections, calendars and counts. */
@RestController
@RequiredArgsConstructor
public class FollowingController implements FollowingApi {
  private final ReadFollowState reads;
  private final ReplaceFollowState changes;
  private final ReadFollowOptions options;
  private final FollowingApiMapper mapper;
  private final FollowingRequest requests;
  private final HttpServletRequest request;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowStateResponse> getTeamFollowState(
      UUID accountId, UUID teamId, Boolean bypass) {
    requests.validateQuery(request, QueryShape.MEMBER);
    return stateResponse(reads.read(requests.member(accountId, TargetType.TEAM, teamId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowStateResponse> replaceTeamFollowState(
      UUID accountId, UUID teamId, ReplaceFollowStateRequest body, Boolean bypass) {
    requests.validateQuery(request, QueryShape.MEMBER);
    return stateResponse(
        changes.replace(requests.member(accountId, TargetType.TEAM, teamId), body.getFollowing()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowStateResponse> getPoolFollowState(
      UUID accountId, UUID poolId, Boolean bypass) {
    requests.validateQuery(request, QueryShape.MEMBER);
    return stateResponse(reads.read(requests.member(accountId, TargetType.POOL, poolId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowStateResponse> replacePoolFollowState(
      UUID accountId, UUID poolId, ReplaceFollowStateRequest body, Boolean bypass) {
    requests.validateQuery(request, QueryShape.MEMBER);
    return stateResponse(
        changes.replace(requests.member(accountId, TargetType.POOL, poolId), body.getFollowing()));
  }

  /**
   * Builds the canonical non-cacheable representation of confirmed member state.
   *
   * @param following application-confirmed state
   * @return the complete generated boolean response with the member cache policy
   */
  private ResponseEntity<FollowStateResponse> stateResponse(boolean following) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(new FollowStateResponse(following));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowerCountResponse> getTeamFollowerCount(UUID teamId, Boolean bypass) {
    throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowerCountResponse> getPoolFollowerCount(UUID poolId, Boolean bypass) {
    throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<TeamFollowsResponse> listTeamFollows(
      UUID accountId, Boolean bypass, UUID seasonId, Long page) {
    throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<PoolFollowsResponse> listPoolFollows(
      UUID accountId, Boolean bypass, UUID seasonId, Long page) {
    throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowOptionsResponse> getFollowOptions(UUID accountId, Boolean bypass) {
    requests.validateQuery(request, QueryShape.MEMBER);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(options.read(requests.requireOwner(accountId))));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<PersonalMatchCalendarResponse> listPersonalMatches(
      UUID accountId,
      CalendarCategoryEnum category,
      String timeZone,
      Boolean bypass,
      UUID seasonId,
      LocalDate nextDay) {
    throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED);
  }
}
