package com.blockout.backend.contributions.api;

import com.blockout.backend.contributions.application.ContributionContext;
import com.blockout.backend.contributions.application.ModerateContribution;
import com.blockout.backend.contributions.application.ReadModeration;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.generated.mobile.api.StreamContributionsApi;
import com.blockout.backend.generated.mobile.model.CreateStreamReactivationRequest;
import com.blockout.backend.generated.mobile.model.ModeratedStreamContributionDetailResponse;
import com.blockout.backend.generated.mobile.model.ModeratedStreamContributionsResponse;
import com.blockout.backend.generated.mobile.model.StreamModerationFilterEnum;
import com.blockout.backend.generated.mobile.model.StreamModerationResponse;
import com.blockout.backend.generated.mobile.model.StreamPlatformEnum;
import com.blockout.backend.generated.mobile.model.StreamReportsResponse;
import com.blockout.backend.generated.mobile.model.StreamVersionFilterEnum;
import com.blockout.backend.generated.mobile.model.UpdateModeratedStreamContributionRequest;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/**
 * Generated private moderation operations; F05/F12 retain authentication and ordinary admission.
 */
@RestController
@RequiredArgsConstructor
public class ContributionModerationController implements StreamContributionsApi {
  private final ContributionRequest request;
  private final ReadModeration reads;
  private final ModerateContribution commands;
  private final ContributionModerationMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<StreamModerationResponse> listStreamModeration(
      Long page,
      UUID seasonId,
      String query,
      StreamPlatformEnum platform,
      StreamModerationFilterEnum state,
      Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(
                reads.queue(actor(), seasonId, query, platform, state, page == null ? 0 : page)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ModeratedStreamContributionsResponse> listModeratedStreamContributions(
      UUID matchId, Boolean bypass, Long page, StreamVersionFilterEnum state) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(reads.read(actor(), matchId, state, page == null ? 0 : page)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ModeratedStreamContributionDetailResponse> getModeratedStreamContribution(
      UUID matchId, UUID contributionId, Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .header("Accept-Patch", "application/json")
        .body(mapper.toDto(reads.member(actor(), matchId, contributionId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ModeratedStreamContributionDetailResponse>
      updateModeratedStreamContribution(
          UUID matchId,
          UUID contributionId,
          UpdateModeratedStreamContributionRequest body,
          Boolean bypass) {
    UUID actor = original(body.getActorAccountId());
    SubmitContribution.Outcome outcome =
        commands.change(actor, matchId, contributionId, body.getRevision(), body.getAction());
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .header("Accept-Patch", "application/json")
        .body(mapper.toDto(reads.result(actor, outcome)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ModeratedStreamContributionDetailResponse> createStreamReactivation(
      UUID matchId, UUID contributionId, CreateStreamReactivationRequest body, Boolean bypass) {
    UUID actor = original(body.getActorAccountId());
    SubmitContribution.Outcome outcome =
        commands.reactivate(actor, matchId, contributionId, body.getRevision());
    return ResponseEntity.created(
            URI.create(
                "/administration/matches/"
                    + matchId
                    + "/stream-contributions/"
                    + outcome.version().id()))
        .cacheControl(CacheControl.noStore())
        .body(mapper.toDto(reads.result(actor, outcome)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<StreamReportsResponse> listStreamReports(
      UUID matchId, UUID contributionId, Long page, Boolean bypass) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            mapper.toDto(reads.reports(actor(), matchId, contributionId, page == null ? 0 : page)));
  }

  /**
   * Resolves only the complete current video capability, with no role or bypass implication.
   *
   * @return current admitted original account after complete-capability validation
   */
  private UUID actor() {
    ContributionContext context = request.current();
    context.requireModeration();
    return context.accountId();
  }

  /**
   * Rejects a command captured for a different original lifecycle before dispatch.
   *
   * @param id original account captured by the explicit command
   * @return matching current admitted moderator account
   */
  private UUID original(UUID id) {
    ContributionContext context = request.current();
    context.requireOriginalAccount(id);
    context.requireModeration();
    return context.accountId();
  }
}
