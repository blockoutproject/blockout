package com.blockout.backend.api.user.api;

import com.blockout.backend.api.user.api.generated.CurrentUserApi;
import com.blockout.backend.identity.user.application.*;
import java.net.URI;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.RestController;

/** HTTP boundary for actor-bound provisioning and side-effect-free reads. */
@RestController
public class CurrentUserController implements CurrentUserApi {
  private static final String USER_IDENTITY_REQUIRED = "USER_IDENTITY_REQUIRED";

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
      case ProfileResult.Missing _ -> problem(404, "USER_NOT_FOUND");
      case ProfileResult.Inactive _ -> problem(403, "USER_INACTIVE");
      case ProfileResult.Unsupported _ -> problem(409, "IDENTITY_NOT_SUPPORTED");
      case ProfileResult.Mismatch _ -> problem(409, "IDENTITY_MISMATCH");
      case ProfileResult.Unavailable failure -> problem(503, failure.code());
    };
  }

  static ResponseEntity<ProblemDetail> problem(int status, String code) {
    var problem =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.valueOf(status),
            switch (code) {
              case "USER_NOT_FOUND" -> "The current profile does not exist.";
              case "USER_INACTIVE" -> "The current profile is inactive.";
              case USER_IDENTITY_REQUIRED -> "A supported native user session is required.";
              case "IDENTITY_NOT_SUPPORTED", "IDENTITY_MISMATCH" ->
                  "The identity cannot be used to create this profile.";
              default -> "Identity verification is temporarily unavailable.";
            });
    problem.setProperty("code", code);
    var response =
        ResponseEntity.status(status)
            .cacheControl(CacheControl.noStore())
            .contentType(MediaType.APPLICATION_PROBLEM_JSON);
    if (status == 503) response.header("Retry-After", "5");
    return response.body(problem);
  }
}
