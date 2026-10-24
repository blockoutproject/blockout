package com.blockout.backend.sporting.application.service;

import com.blockout.backend.collection.application.model.CollectionState;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.shared.image.ImageValidator;
import com.blockout.backend.shared.image.ImageValidator.ValidatedImage;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.io.IOException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Bounded native content validation and independent, fenced source-image replacement. */
@Service
@RequiredArgsConstructor
public class SportingImageService {
  public static final int MAX_BYTES = 5_242_880;
  private final SportingStore store;
  private final CollectionCycleService cycles;
  private final ClassificationService classifications;

  /**
   * Decodes actual PNG/JPEG content outside a write transaction after the caller's grant preflight.
   *
   * @param bytes original bounded content, never an arbitrary URL
   * @return immutable original bytes with their detected content type
   * @throws SportingValidationException for oversized, unsupported or undecodable content
   */
  public static Image validate(byte[] bytes) {
    if (bytes.length == 0 || bytes.length > MAX_BYTES) throw new SportingValidationException();
    try {
      ValidatedImage validated = ImageValidator.validate(bytes);
      return new Image(validated.bytes(), validated.mediaType());
    } catch (IOException invalid) {
      throw new SportingValidationException();
    }
  }

  /**
   * Checks current image acquisition authority before decoding; the later write checks it again.
   *
   * @param teamId existing professional participant
   * @param context admitted current calendar cycle
   */
  @Transactional
  public void requireSource(UUID teamId, MatchObservation.Context context) {
    requireTarget(teamId, context);
  }

  /**
   * Commits valid source bytes and metadata together while holding the F01 fence through commit.
   *
   * @param teamId already established professional team
   * @param context exact admitted observation context
   * @param image bounded content decoded outside this transaction
   * @return accepted, unchanged, stale or currently ineligible outcome; matches are independent
   */
  @Transactional
  public ObservationOutcome acceptSource(
      UUID teamId, MatchObservation.Context context, Image image) {
    CollectionState.Target target = requireTarget(teamId, context);
    TeamView team = store.team(teamId).orElseThrow(SportingResourceNotFoundException::new);
    ObservationOrder order =
        new ObservationOrder(cycles.get(context.cycleId()).cycleOrder(), context.readOrdinal());
    ObservationOrder previous = store.sourceLogoOrder(teamId);
    ObservationOutcomeEnum status;
    if (previous != null && order.compareTo(previous) <= 0)
      status =
          order.compareTo(previous) < 0
              ? ObservationOutcomeEnum.STALE
              : ObservationOutcomeEnum.UNCHANGED;
    else if (!classifications.acceptsObservation(target.scopeId(), target))
      status = ObservationOutcomeEnum.REJECTED;
    else
      status =
          store.saveSourceLogo(teamId, image, order, context)
              ? ObservationOutcomeEnum.ACCEPTED
              : ObservationOutcomeEnum.UNCHANGED;
    return new ObservationOutcome(team.nativeReference(), status, teamId, null, null, null);
  }

  /**
   * Obtains the runtime/season/cycle fence before loading mutable team facts; no later root follows
   * an account lock, and no provider call takes place under this capability.
   *
   * @param teamId existing seasonal team
   * @param context supplied cycle identity
   * @return exact admitted calendar membership
   */
  private CollectionState.Target requireTarget(UUID teamId, MatchObservation.Context context) {
    CollectionState.Target target =
        cycles.requireTeamLogo(context.cycleId(), store.teamPoolIds(teamId));
    TeamView team = store.team(teamId).orElseThrow(SportingResourceNotFoundException::new);
    if (team.provider() != CollectionProviderEnum.LNV)
      throw new AccessDeniedException("Professional artwork is not permitted");
    return target;
  }
}
