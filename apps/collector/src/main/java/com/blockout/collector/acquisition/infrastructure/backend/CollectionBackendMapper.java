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
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Maps generated transport objects immediately to immutable application capabilities. */
@Mapper(config = MappingConfiguration.class)
public interface CollectionBackendMapper {
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
  ObserveSeasonSourceInternalRequest toRequest(CollectionBackend.SourceProposal source);

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
  StartCollectionCycleInternalRequest toRequest(CollectionBackend.StartCycle source);

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
  RecordCollectionResultInternalRequest toRequest(CollectionBackend.Result source);

  /**
   * Maps candidate evidence without inferring source qualification.
   *
   * @param source terminal candidate evidence
   * @return exact generated submission without inferred qualification
   */
  SubmitSourceValidationInternalRequest toRequest(CollectionBackend.Validation source);

  /**
   * Preserves a decoded backend timestamp.
   *
   * @param source known timestamp
   * @return identical instant
   */
  default Instant toInstant(OffsetDateTime source) {
    return source.toInstant();
  }

  /**
   * Represents an actual instant in UTC.
   *
   * @param source actual instant
   * @return UTC wire representation
   */
  default OffsetDateTime toDate(Instant source) {
    return source.atOffset(ZoneOffset.UTC);
  }
}
