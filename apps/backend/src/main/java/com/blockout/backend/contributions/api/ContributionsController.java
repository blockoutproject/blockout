package com.blockout.backend.contributions.api;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.contributions.application.ContributionContext;
import com.blockout.backend.contributions.application.ReadOwnContributions;
import com.blockout.backend.contributions.application.SubmitContribution;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.generated.mobile.api.StreamSubmissionApi;
import com.blockout.backend.generated.mobile.model.CreateModeratedStreamContributionRequest;
import com.blockout.backend.generated.mobile.model.CreateStreamContributionRequest;
import com.blockout.backend.generated.mobile.model.ModeratedStreamContributionDetailResponse;
import com.blockout.backend.generated.mobile.model.ModeratedStreamContributionResponse;
import com.blockout.backend.generated.mobile.model.OwnStreamContributionDetailResponse;
import com.blockout.backend.generated.mobile.model.OwnStreamContributionsResponse;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Generated submission/read boundary; shared security and admission remain with F05/F12. */
@RestController
@RequiredArgsConstructor
public class ContributionsController implements StreamSubmissionApi {
  private final ContributionRequest request;
  private final SubmitContribution submissions;
  private final ReadOwnContributions reads;
  private final ContributionApiMapper mapper;
  private final AccountAccess accounts;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<OwnStreamContributionDetailResponse> createStreamContribution(
      UUID accountId, UUID matchId, CreateStreamContributionRequest body, Boolean bypass) {
    request.current().requireOriginalAccount(accountId);
    SubmitContribution.Outcome outcome =
        submissions.submit(accountId, matchId, body.getRevision(), body.getUrl(), false);
    String member =
        "/accounts/"
            + accountId
            + "/matches/"
            + matchId
            + "/stream-contributions/"
            + outcome.version().id();
    return response(
        outcome.created(),
        member,
        new OwnStreamContributionDetailResponse(outcome.revision(), mapper.own(outcome.version())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<OwnStreamContributionsResponse> listOwnStreamContributions(
      UUID accountId, UUID matchId, Boolean bypass, Long page) {
    request.current().requireOriginalAccount(accountId);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(mapper.page(reads.read(accountId, matchId, page == null ? 0 : page)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<OwnStreamContributionDetailResponse> getOwnStreamContribution(
      UUID accountId, UUID matchId, UUID contributionId, Boolean bypass) {
    request.current().requireOriginalAccount(accountId);
    ReadOwnContributions.Detail detail = reads.member(accountId, matchId, contributionId);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(
            new OwnStreamContributionDetailResponse(
                detail.revision(), mapper.own(detail.version())));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ModeratedStreamContributionDetailResponse>
      createModeratedStreamContribution(
          UUID matchId, CreateModeratedStreamContributionRequest body, Boolean bypass) {
    ContributionContext context = request.current();
    context.requireOriginalAccount(body.getActorAccountId());
    context.requireModeration();
    SubmitContribution.Outcome outcome =
        submissions.submit(context.accountId(), matchId, body.getRevision(), body.getUrl(), true);
    ContributionVersion version = outcome.version();
    ModeratedStreamContributionResponse contribution =
        mapper.moderated(version, accounts.displayName(context.accountId()));
    return response(
        outcome.created(),
        "/administration/matches/" + matchId + "/stream-contributions/" + version.id(),
        new ModeratedStreamContributionDetailResponse(outcome.revision(), contribution));
  }

  /**
   * Builds completed creation/current-state responses with exact member Location and no-store.
   *
   * @param <T> canonical generated response type
   * @param created whether a resource was created
   * @param member exact member URI identifying a completed creation
   * @param body canonical response
   * @return 201 with Location or 200 for a current repetition
   */
  private <T> ResponseEntity<T> response(boolean created, String member, T body) {
    if (created)
      return ResponseEntity.created(URI.create(member))
          .cacheControl(CacheControl.noStore())
          .body(body);
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
  }
}
