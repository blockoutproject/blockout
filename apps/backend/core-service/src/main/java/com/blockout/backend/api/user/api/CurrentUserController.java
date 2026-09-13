package com.blockout.backend.api.user.api;

import static com.blockout.shared.model.ApiProblemCodeEnum.*;

import com.blockout.backend.api.error.ApiProblems;
import com.blockout.backend.api.user.api.generated.CurrentUserApi;
import com.blockout.backend.identity.user.application.*;
import com.blockout.shared.model.ApiProblemCodeEnum;
import java.net.URI;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.RestController;

/** HTTP boundary for actor-bound provisioning and side-effect-free reads. */
@RestController
public class CurrentUserController implements CurrentUserApi {
  private final UserProfiles profiles;
  private final CurrentUserActor actors;
  private final UserProfileMapper mapper;

  public CurrentUserController(
      UserProfiles profiles, CurrentUserActor actors, UserProfileMapper mapper) {
    this.profiles = profiles;
    this.actors = actors;
    this.mapper = mapper;
  }

  @Override
  public ResponseEntity<?> ensureCurrentUser() {
    var actor = actors.current();
    if (actor.isEmpty()) return problem(403, USER_IDENTITY_REQUIRED);
    return response(profiles.ensure(actor.get()));
  }

  @Override
  public ResponseEntity<?> getCurrentUser() {
    var actor = actors.current();
    if (actor.isEmpty()) return problem(403, USER_IDENTITY_REQUIRED);
    return response(profiles.find(actor.get()));
  }

  private ResponseEntity<?> response(ProfileResult result) {
    return switch (result) {
      case ProfileResult.Available available -> {
        var builder =
            ResponseEntity.status(available.created() ? 201 : 200)
                .cacheControl(CacheControl.noStore());
        if (available.created()) builder.location(URI.create("/api/v2/users/me"));
        yield builder.body(mapper.toResponse(available.profile()));
      }
      case ProfileResult.Missing _ -> problem(404, USER_NOT_FOUND);
      case ProfileResult.Inactive _ -> problem(403, USER_INACTIVE);
      case ProfileResult.Unsupported _ -> problem(409, IDENTITY_NOT_SUPPORTED);
      case ProfileResult.Mismatch _ -> problem(409, IDENTITY_MISMATCH);
      case ProfileResult.Unavailable failure ->
          problem(
              503,
              switch (failure.reason()) {
                case IDENTITY_PROVIDER_UNAVAILABLE -> IDENTITY_PROVIDER_UNAVAILABLE;
                case IDENTITY_CONFIGURATION_ERROR -> IDENTITY_CONFIGURATION_ERROR;
              });
    };
  }

  static ResponseEntity<ProblemDetail> problem(int status, ApiProblemCodeEnum code) {
    var problem = ApiProblems.create(HttpStatus.valueOf(status), code);
    var response =
        ResponseEntity.status(status)
            .cacheControl(CacheControl.noStore())
            .contentType(MediaType.APPLICATION_PROBLEM_JSON);
    if (status == 503) response.header("Retry-After", "5");
    return response.body(problem);
  }
}
