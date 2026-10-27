package com.blockout.collector.acquisition.application;

import com.blockout.collector.acquisition.lnv.LnvDiscovery;
import com.blockout.collector.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.collector.generated.ingestion.model.SourceValidationStateEnum;
import java.net.URI;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

/** Qualifies the exact admitted candidate and uses the existing one-attempt terminal handoff. */
@Service
public class QualifySource {
  private final ProviderPages lnvHttp;
  private final DiscoverSeasonSources discovery;
  private final LnvDiscovery lnv;
  private final CollectionBackend backend;
  private final CollectorLifecycle lifecycle;
  private final Clock clock;

  /** Supported structure and optional explicit season evidence, without operator confirmation. */
  public record Evidence(
      SourceValidationStateEnum state, String seasonEvidence, String reason, URI reasonType) {}

  /**
   * Binds explicit provider adapters to the existing admission and completion boundaries.
   *
   * @param lnvHttp shared LNV budget
   * @param discovery published FFVB frame and selector traversal
   * @param lnv native LNV interpreter
   * @param backend admitted candidate reader
   * @param lifecycle current incarnation and terminal-write policy
   * @param clock actual read completion time
   */
  public QualifySource(
      @Qualifier("lnvProviderClient") ProviderPages lnvHttp,
      LnvDiscovery lnv,
      DiscoverSeasonSources discovery,
      CollectionBackend backend,
      CollectorLifecycle lifecycle,
      Clock clock) {
    this.lnvHttp = lnvHttp;
    this.discovery = discovery;
    this.lnv = lnv;
    this.backend = backend;
    this.lifecycle = lifecycle;
    this.clock = clock;
  }

  /**
   * Reads the frozen candidate and submits its terminal qualification exactly once.
   *
   * @param context confirmed candidate capability
   * @return whether the original terminal operation was confirmed
   */
  public boolean execute(CollectorLifecycle.AdmittedCycle context) {
    if (context.getCycle().sourceBindingId() == null)
      throw new IllegalArgumentException("Candidate context required");
    CollectionBackend.Candidate candidate = backend.candidate(context.getCycle().id());
    context.nextReadOrdinal();
    Evidence evidence = qualify(candidate);
    return lifecycle.validate(
        context,
        new CollectionBackend.Validation(
            context.getCycle().id(),
            evidence.state(),
            clock.instant(),
            evidence.seasonEvidence(),
            evidence.reason(),
            evidence.reasonType()));
  }

  /**
   * Interprets a supported candidate, including its final redirected context.
   *
   * @param candidate exact expected provider, organizer/championship and season
   * @return safe terminal evidence; confirmation fills absence only, never contradiction
   */
  public Evidence qualify(CollectionBackend.Candidate candidate) {
    try {
      String season;
      if (candidate.provider() == CollectionProviderEnum.FFVB) {
        SportingObservation.Catalog catalog =
            discovery
                .catalog(
                    CollectionBackend.Target.builder()
                        .provider(CollectionProviderEnum.FFVB)
                        .url(candidate.candidateUrl())
                        .seasonLabel(candidate.seasonLabel())
                        .organizerReference(candidate.organizerReference())
                        .build())
                .catalog();
        if (!catalog.complete())
          return new Evidence(
              SourceValidationStateEnum.INVALID,
              null,
              "Incomplete FFVB catalog",
              URI.create("urn:blockout:acquisition:structure"));
        season = candidate.seasonLabel();
      } else {
        ProviderResponse response = lnvHttp.page(candidate.candidateUrl()).join();
        season = lnv.qualify(response.body(), response.url(), candidate.organizerReference());
      }
      if (season == null)
        return new Evidence(SourceValidationStateEnum.CONFIRMATION_REQUIRED, null, null, null);
      if (!season.equals(candidate.seasonLabel()))
        return new Evidence(
            SourceValidationStateEnum.INVALID,
            season,
            "Contradictory season evidence",
            URI.create("urn:blockout:acquisition:context"));
      return new Evidence(SourceValidationStateEnum.QUALIFIED, season, null, null);
    } catch (RuntimeException failure) {
      return new Evidence(
          SourceValidationStateEnum.INVALID,
          null,
          "Unavailable or unsupported source context",
          AcquisitionFailure.reasonType(failure));
    }
  }
}
