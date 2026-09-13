package com.blockout.backend.api.user.api;

import static com.blockout.shared.model.ApiProblemCodeEnum.*;

import com.blockout.backend.api.error.ApiProblems;
import com.blockout.backend.api.user.api.generated.CurrentUserApi;
import com.blockout.backend.identity.user.application.*;
import com.blockout.backend.identity.user.domain.ExternalIdentity;
import com.blockout.shared.model.ApiProblemCodeEnum;
import java.net.URI;
import java.util.Optional;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.RestController;

/** HTTP boundary for actor-bound provisioning and side-effect-free reads. */
@RestController
public class CurrentUserController implements CurrentUserApi {
  private final UserProfiles profiles;
  private final CurrentUserActor actors;
  private final UserProfileMapper mapper;

  /**
   * Connects actor-bound HTTP operations to the profile owner and generated transport mapping.
   *
   * @param profiles profile recreation and local-read use cases
   * @param actors trusted native-user extraction
   * @param mapper mapping to the public generated profile model
   */
  public CurrentUserController(
      UserProfiles profiles, CurrentUserActor actors, UserProfileMapper mapper) {
    this.profiles = profiles;
    this.actors = actors;
    this.mapper = mapper;
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> ensureCurrentUser() {
    Optional<ExternalIdentity> actor = actors.current();
    if (actor.isEmpty()) return problem(403, USER_IDENTITY_REQUIRED);
    return response(profiles.ensure(actor.get()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> getCurrentUser() {
    Optional<ExternalIdentity> actor = actors.current();
    if (actor.isEmpty()) return problem(403, USER_IDENTITY_REQUIRED);
    return response(profiles.find(actor.get()));
  }

  /**
   * Maps owner outcomes to HTTP without exposing identity or billing records. Only a newly created
   * profile returns 201 and Location; repeated reads return 200.
   *
   * @param result profile owner result
   * @return an uncacheable profile response or safe problem
   */
  private ResponseEntity<?> response(ProfileResult result) {
    return switch (result) {
      case ProfileResult.Available available -> {
        ResponseEntity.BodyBuilder builder =
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

  /**
   * Builds an uncacheable profile failure with a five-second retry hint for temporary
   * unavailability.
   *
   * @param status HTTP failure status
   * @param code generated code selected by the profile adapter
   * @return the native problem and recovery headers
   */
  static ResponseEntity<ProblemDetail> problem(int status, ApiProblemCodeEnum code) {
    ProblemDetail problem = ApiProblems.create(HttpStatus.valueOf(status), code);
    ResponseEntity.BodyBuilder response =
        ResponseEntity.status(status)
            .cacheControl(CacheControl.noStore())
            .contentType(MediaType.APPLICATION_PROBLEM_JSON);
    if (status == 503) response.header("Retry-After", "5");
    return response.body(problem);
  }
}
