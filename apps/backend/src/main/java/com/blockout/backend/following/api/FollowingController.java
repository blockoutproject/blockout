package com.blockout.backend.following.api;

import com.blockout.backend.following.application.FollowContext.Target;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.FollowState;
import com.blockout.backend.following.application.ReadFollowLists;
import com.blockout.backend.following.application.ReadFollowOptions;
import com.blockout.backend.following.application.ReadFollowerCount;
import com.blockout.backend.following.application.ReadPersonalCalendar;
import com.blockout.backend.generated.mobile.api.FollowingApi;
import com.blockout.backend.generated.mobile.model.CalendarCategoryEnum;
import com.blockout.backend.generated.mobile.model.FollowOptionsResponse;
import com.blockout.backend.generated.mobile.model.FollowStateResponse;
import com.blockout.backend.generated.mobile.model.FollowerCountResponse;
import com.blockout.backend.generated.mobile.model.PersonalMatchCalendarResponse;
import com.blockout.backend.generated.mobile.model.PoolFollowsResponse;
import com.blockout.backend.generated.mobile.model.ReplaceFollowStateRequest;
import com.blockout.backend.generated.mobile.model.TeamFollowsResponse;
import com.blockout.backend.sporting.application.ConsultationRequest.CalendarWindow;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Canonical private following routes and independently readable public relation counts. */
@RestController
@RequiredArgsConstructor
public class FollowingController implements FollowingApi {
  private final FollowState state;
  private final ReadFollowerCount counts;
  private final ReadFollowOptions options;
  private final ReadPersonalCalendar calendars;
  private final ReadFollowLists lists;
  private final FollowingApiMapper mapper;
  private final FollowingRequest requests;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowStateResponse> getTeamFollowState(
      UUID accountId, UUID teamId, Boolean bypass) {
    return stateResponse(state.read(requests.member(accountId, TargetType.TEAM, teamId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowStateResponse> replaceTeamFollowState(
      UUID accountId, UUID teamId, ReplaceFollowStateRequest body, Boolean bypass) {
    return stateResponse(
        state.replace(requests.member(accountId, TargetType.TEAM, teamId), body.getFollowing()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowStateResponse> getPoolFollowState(
      UUID accountId, UUID poolId, Boolean bypass) {
    return stateResponse(state.read(requests.member(accountId, TargetType.POOL, poolId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowStateResponse> replacePoolFollowState(
      UUID accountId, UUID poolId, ReplaceFollowStateRequest body, Boolean bypass) {
    return stateResponse(
        state.replace(requests.member(accountId, TargetType.POOL, poolId), body.getFollowing()));
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
    return countResponse(new Target(TargetType.TEAM, teamId));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowerCountResponse> getPoolFollowerCount(UUID poolId, Boolean bypass) {
    return countResponse(new Target(TargetType.POOL, poolId));
  }

  /**
   * Reads the public count without resolving the viewer's private original account.
   *
   * @param target exact sporting identity supplied by the canonical route
   * @return non-cacheable direct count with no follower identities
   */
  private ResponseEntity<FollowerCountResponse> countResponse(Target target) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(new FollowerCountResponse(counts.read(target)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<TeamFollowsResponse> listTeamFollows(
      UUID accountId, Boolean bypass, UUID seasonId, Long page) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(lists.teams(requests.requireOwner(accountId), seasonId, page)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<PoolFollowsResponse> listPoolFollows(
      UUID accountId, Boolean bypass, UUID seasonId, Long page) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(lists.pools(requests.requireOwner(accountId), seasonId, page)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<FollowOptionsResponse> getFollowOptions(UUID accountId, Boolean bypass) {
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
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                calendars.read(
                    requests.requireOwner(accountId),
                    seasonId,
                    new CalendarWindow(category, requests.calendarZone(timeZone), nextDay))));
  }
}
