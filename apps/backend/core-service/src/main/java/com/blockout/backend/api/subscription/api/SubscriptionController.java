package com.blockout.backend.api.subscription.api;

import static com.blockout.shared.model.ApiProblemCodeEnum.*;

import com.blockout.backend.api.error.ApiProblems;
import com.blockout.backend.api.user.api.CurrentUserActor;
import com.blockout.backend.api.user.api.generated.SubscriptionApi;
import com.blockout.backend.identity.subscription.application.Subscriptions;
import com.blockout.backend.identity.user.application.*;
import com.blockout.backend.identity.user.domain.ExternalIdentity;
import com.blockout.shared.model.ApiProblemCodeEnum;
import java.net.URI;
import java.util.Optional;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.RestController;

/** Current-user subscription transport; provider reads never execute in the HTTP request. */
@RestController
public class SubscriptionController implements SubscriptionApi {
  private final CurrentUserActor actors;
  private final UserProfiles profiles;
  private final Subscriptions subscriptions;
  private final SubscriptionMapper mapper;

  /**
   * Binds trusted actor extraction to owner reads and generated mapping.
   *
   * @param actors native-user JWT extraction
   * @param profiles existing active-profile lookup
   * @param subscriptions subscription operations
   * @param mapper generated transport projection
   */
  public SubscriptionController(
      CurrentUserActor actors,
      UserProfiles profiles,
      Subscriptions subscriptions,
      SubscriptionMapper mapper) {
    this.actors = actors;
    this.profiles = profiles;
    this.subscriptions = subscriptions;
    this.mapper = mapper;
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> getCurrentSubscription() {
    return current(false);
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> refreshCurrentSubscription() {
    return current(true);
  }

  /**
   * Resolves the authenticated owner once before consultation or explicit publication.
   *
   * @param refresh whether this POST requests work
   * @return private evidence, accepted work or a safe profile failure
   */
  private ResponseEntity<?> current(boolean refresh) {
    Optional<ExternalIdentity> actor = actors.current();
    if (actor.isEmpty()) return problem(HttpStatus.FORBIDDEN, USER_IDENTITY_REQUIRED);
    return switch (profiles.find(actor.get())) {
      case ProfileResult.Available available -> {
        if (refresh) {
          subscriptions.refresh(available.profile().id());
          yield ResponseEntity.accepted()
              .location(URI.create("/api/v2/users/me/subscription"))
              .header("Retry-After", "30")
              .cacheControl(CacheControl.noStore().cachePrivate())
              .build();
        }
        yield ResponseEntity.ok()
            .cacheControl(CacheControl.noStore().cachePrivate())
            .body(mapper.toResponse(subscriptions.find(available.profile().id())));
      }
      case ProfileResult.Missing _ -> problem(HttpStatus.NOT_FOUND, USER_NOT_FOUND);
      case ProfileResult.Inactive _ -> problem(HttpStatus.FORBIDDEN, USER_INACTIVE);
      case ProfileResult.Unsupported _, ProfileResult.Mismatch _ ->
          problem(HttpStatus.CONFLICT, IDENTITY_NOT_SUPPORTED);
      case ProfileResult.Unavailable _ ->
          problem(HttpStatus.SERVICE_UNAVAILABLE, SUBSCRIPTION_STORE_UNAVAILABLE);
    };
  }

  /**
   * Creates a safe private response for an expected owner rejection.
   *
   * @param status selected HTTP status
   * @param code shared wire code
   * @return native ProblemDetail
   */
  private static ResponseEntity<ProblemDetail> problem(HttpStatus status, ApiProblemCodeEnum code) {
    return ResponseEntity.status(status)
        .cacheControl(CacheControl.noStore().cachePrivate())
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(ApiProblems.create(status, code));
  }
}
