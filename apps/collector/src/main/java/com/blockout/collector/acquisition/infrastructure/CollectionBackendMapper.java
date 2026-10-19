package com.blockout.collector.acquisition.infrastructure;

import com.blockout.collector.acquisition.application.CollectionBackend;
import com.blockout.collector.generated.ingestion.model.CollectionCycleInternalResponse;
import com.blockout.collector.generated.ingestion.model.CollectorRuntimeInternalResponse;
import com.blockout.collector.generated.ingestion.model.StartCollectionCycleInternalRequest;
import org.mapstruct.InjectionStrategy;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.ReportingPolicy;

/** Maps generated transport objects immediately to immutable application capabilities. */
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.ERROR,
    injectionStrategy = InjectionStrategy.CONSTRUCTOR,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS)
public interface CollectionBackendMapper {
  /**
   * Projects the validated runtime.
   *
   * @param source validated current registration
   * @return immutable runtime state
   */
  CollectionBackend.Runtime toView(CollectorRuntimeInternalResponse source);

  /**
   * Projects the admitted capability and its conditional purpose.
   *
   * @param source validated backend context
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
}
