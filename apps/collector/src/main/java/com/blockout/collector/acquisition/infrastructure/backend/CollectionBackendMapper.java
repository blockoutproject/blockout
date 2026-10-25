package com.blockout.collector.acquisition.infrastructure.backend;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.config.MappingConfiguration;
import com.blockout.collector.generated.ingestion.model.CollectionCycleInternalResponse;
import com.blockout.collector.generated.ingestion.model.CollectionTargetInternalResponse;
import com.blockout.collector.generated.ingestion.model.CollectionTargetPageInternalResponse;
import com.blockout.collector.generated.ingestion.model.CollectorRuntimeInternalResponse;
import com.blockout.collector.generated.ingestion.model.ObserveSeasonSourceInternalRequest;
import com.blockout.collector.generated.ingestion.model.RecordCollectionResultInternalRequest;
import com.blockout.collector.generated.ingestion.model.SourceValidationWorkInternalResponse;
import com.blockout.collector.generated.ingestion.model.StartCollectionCycleInternalRequest;
import com.blockout.collector.generated.ingestion.model.SubmitSourceValidationInternalRequest;
import com.blockout.collector.shared.mapping.TemporalMapping;
import java.time.Instant;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Maps generated transport objects immediately to immutable application capabilities. */
@Mapper(config = MappingConfiguration.class, uses = TemporalMapping.class)
public interface CollectionBackendMapper {
  /**
   * Maps one identified registration to its generated request.
   *
   * @param revision observed backend revision
   * @param incarnationId current collector startup identity
   * @return exact registration proposal
   */
  com.blockout.collector.generated.ingestion.model.RegisterCollectorRuntimeInternalRequest toDto(
      long revision, java.util.UUID incarnationId);

  /**
   * Maps actual completion time without manufacturing a timestamp.
   *
   * @param completedAt actual passage completion instant
   * @return generated completion request
   */
  @Mapping(target = "completedAt", source = "completedAt")
  com.blockout.collector.generated.ingestion.model.CompleteCollectionCycleInternalRequest toDto(
      Instant completedAt);

  /**
   * Maps current intent only, with no admission or retained fallback.
   *
   * @param source generated current-work response
   * @return immutable application intent
   */
  CollectionBackend.Work toView(
      com.blockout.collector.generated.ingestion.model.CollectionWorkInternalResponse source);

  /**
   * Keeps current eligibility and backend-owned pending mode at the scheduler boundary.
   *
   * @param source generated independent control
   * @return application scheduling context
   */
  CollectionBackend.ControlWork toWork(
      com.blockout.collector.generated.ingestion.model.CollectionControlInternalResponse source);

  /**
   * Keeps only the identity and revision needed to admit an exact pending candidate.
   *
   * @param source generated current candidate work
   * @return exact admission identity and revision
   */
  CollectionBackend.ValidationWork toWork(SourceValidationWorkInternalResponse source);

  /**
   * Maps qualified discovery without inventing lifecycle or classification.
   *
   * @param source source-entry evidence
   * @return strict generated proposal
   */
  ObserveSeasonSourceInternalRequest toDto(CollectionBackend.SourceProposal source);

  /**
   * Preserves the admitted candidate's provider, root and seasonal scope.
   *
   * @param source generated frozen validation context
   * @return immutable candidate values
   */
  CollectionBackend.Candidate toCandidate(SourceValidationWorkInternalResponse source);

  /**
   * Projects the decoded runtime.
   *
   * @param source decoded current registration
   * @return immutable runtime state
   */
  CollectionBackend.Runtime toView(CollectorRuntimeInternalResponse source);

  /**
   * Projects the admitted capability and its conditional purpose.
   *
   * @param source decoded backend context
   * @return minimal capability, retaining conditional-purpose information
   */
  @Mapping(target = "hasCandidate", expression = "java(source.getCandidate() != null)")
  CollectionBackend.Cycle toView(CollectionCycleInternalResponse source);

  /**
   * Maps an identified command to its strict generated request.
   *
   * @param source one identified application admission
   * @return strict generated request with absent inapplicable fields
   */
  StartCollectionCycleInternalRequest toDto(CollectionBackend.StartCycle source);

  /**
   * Preserves frozen provider references in the application target.
   *
   * @param source decoded frozen target
   * @return immutable context with exact provider references
   */
  CollectionBackend.Target toView(CollectionTargetInternalResponse source);

  /**
   * Projects bounded admitted work without a resumable checkpoint.
   *
   * @param source bounded snapshot page
   * @return admitted work without a resumable checkpoint
   */
  CollectionBackend.TargetPage toView(CollectionTargetPageInternalResponse source);

  /**
   * Maps independent attempt evidence to its generated submission.
   *
   * @param source actual independent phase evidence
   * @return generated current-result submission
   */
  RecordCollectionResultInternalRequest toDto(CollectionBackend.Result source);

  /**
   * Maps candidate evidence without inferring source qualification.
   *
   * @param source terminal candidate evidence
   * @return exact generated submission without inferred qualification
   */
  SubmitSourceValidationInternalRequest toDto(CollectionBackend.Validation source);
}
