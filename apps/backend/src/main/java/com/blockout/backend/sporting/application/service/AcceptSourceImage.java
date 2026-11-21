package com.blockout.backend.sporting.application.service;

import com.blockout.backend.collection.application.exception.CollectionConflictException;
import com.blockout.backend.collection.application.model.CollectionState.Target;
import com.blockout.backend.collection.application.service.CollectionCycleAccess;
import com.blockout.backend.collection.application.service.CollectionCycleAccess.AdmittedScope;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.MatchObservation;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.model.SportingViews.TeamView;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Independent fenced acceptance of already validated source-image content. */
@Service
@RequiredArgsConstructor
public class AcceptSourceImage {
  private final SportingStore store;
  private final CollectionCycleAccess cycleAccess;
  private final CheckAcquisitionClassification acquisitionClassification;

  /**
   * Checks current image acquisition authority before decoding; the later write checks it again.
   *
   * @param teamId existing professional participant
   * @param context admitted current parent-calendar cycle
   * @throws CollectionConflictException when no current parent calendar authorizes the image
   * @throws SportingResourceNotFoundException when the authorized team no longer exists
   * @throws AccessDeniedException when the team belongs to a non-LNV source
   */
  @Transactional
  public void requireSource(UUID teamId, MatchObservation.Context context) {
    admit(teamId, context);
    requireProfessionalTeam(teamId);
  }

  /**
   * Commits valid source bytes and metadata together while holding the F01 fence through commit.
   *
   * @param teamId already established professional team
   * @param context exact admitted observation context
   * @param image bounded content decoded outside this transaction
   * @return accepted, unchanged, stale or currently ineligible outcome; matches are independent
   * @throws CollectionConflictException when no current parent calendar authorizes the image
   * @throws SportingResourceNotFoundException when the authorized team no longer exists
   * @throws AccessDeniedException when the team belongs to a non-LNV source
   */
  @Transactional
  public ObservationOutcome acceptSource(
      UUID teamId, MatchObservation.Context context, Image image) {
    AdmittedScope<Target> admission = admit(teamId, context);
    TeamView team = requireProfessionalTeam(teamId);
    ObservationOrder order = context.order(admission.cycle().cycleOrder());
    ObservationOrder previous = store.sourceLogoOrder(teamId);
    ObservationOutcomeEnum status;
    if (previous != null && order.compareTo(previous) <= 0) {
      status =
          order.compareTo(previous) < 0
              ? ObservationOutcomeEnum.STALE
              : ObservationOutcomeEnum.UNCHANGED;
    } else if (!acquisitionClassification.acceptsObservation(
        admission.scope().poolId(), admission.scope())) {
      status = ObservationOutcomeEnum.REJECTED;
    } else {
      status =
          store.saveSourceLogo(teamId, image, order, context)
              ? ObservationOutcomeEnum.ACCEPTED
              : ObservationOutcomeEnum.UNCHANGED;
    }
    return new ObservationOutcome(team.nativeReference(), status, teamId, null, null, null);
  }

  /**
   * Obtains the runtime/season/cycle fence before loading mutable team facts; no later root follows
   * an account lock, and no provider call takes place under this capability.
   *
   * @param teamId existing seasonal team
   * @param context supplied cycle identity
   * @return admitted calendar membership
   * @throws CollectionConflictException when the cycle or parent membership is no longer admitted
   */
  private AdmittedScope<Target> admit(UUID teamId, MatchObservation.Context context) {
    return cycleAccess.requireTeamLogo(context.cycleId(), store.teamPoolIds(teamId));
  }

  private TeamView requireProfessionalTeam(UUID teamId) {
    TeamView team = store.team(teamId).orElseThrow(SportingResourceNotFoundException::new);
    if (team.provider() != CollectionProviderEnum.LNV) {
      throw new AccessDeniedException("Professional artwork is not permitted");
    }
    return team;
  }
}
