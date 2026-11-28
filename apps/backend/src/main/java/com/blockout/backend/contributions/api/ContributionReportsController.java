package com.blockout.backend.contributions.api;

import com.blockout.backend.contributions.application.ReadOwnReport;
import com.blockout.backend.contributions.application.ReportContribution;
import com.blockout.backend.generated.mobile.api.StreamReportsApi;
import com.blockout.backend.generated.mobile.model.CreateStreamReportRequest;
import com.blockout.backend.generated.mobile.model.StreamReportStateResponse;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/**
 * Canonical reason-only report boundary under existing original-account and F12 admission guards.
 */
@RestController
@RequiredArgsConstructor
public class ContributionReportsController implements StreamReportsApi {
  private final ContributionRequest request;
  private final ReportContribution reports;
  private final ReadOwnReport reads;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<StreamReportStateResponse> getOwnStreamReport(
      UUID accountId, UUID contributionId, Boolean bypass) {
    request.current().requireOriginalAccount(accountId);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(new StreamReportStateResponse(reads.read(accountId, contributionId)));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<StreamReportStateResponse> createStreamReport(
      UUID accountId, UUID contributionId, CreateStreamReportRequest body, Boolean bypass) {
    request.current().requireOriginalAccount(accountId);
    boolean created = reports.report(accountId, contributionId, body.getReason());
    ResponseEntity.BodyBuilder response =
        created
            ? ResponseEntity.created(
                URI.create(
                    "/accounts/"
                        + accountId
                        + "/stream-contributions/"
                        + contributionId
                        + "/report"))
            : ResponseEntity.ok();
    return response.cacheControl(CacheControl.noStore()).body(new StreamReportStateResponse(true));
  }
}
