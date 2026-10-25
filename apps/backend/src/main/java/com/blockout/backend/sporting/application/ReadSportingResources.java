package com.blockout.backend.sporting.application;

import com.blockout.backend.generated.mobile.model.TeamLogoSelectionEnum;
import com.blockout.backend.sporting.application.ConsultationReadPort.ClubSeasonRequest;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingPresentation.Image;
import com.blockout.backend.sporting.application.service.SportingReadService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Current public reads; F12 admits HTTP requests and F02 retains all sporting/image authority. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ReadSportingResources {
  private final ConsultationReadPort reads;
  private final SportingReadService owners;

  /**
   * Reads only the current public club identity for summary consumers.
   *
   * @param id exact club identity
   * @return current permitted names and logo link
   * @throws SportingResourceNotFoundException when the identity is unavailable
   */
  public ConsultationViews.Identity clubIdentity(UUID id) {
    return reads.clubIdentity(id).orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads exact current club facts and viewable seasons.
   *
   * @param id addressed club identity
   * @return detached permitted facts
   * @throws SportingResourceNotFoundException when the identity is unavailable
   */
  public ConsultationViews.ClubDetail club(UUID id) {
    return reads.club(id).orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads every viewable team in an explicitly selected club season.
   *
   * @param request exact club/season without fallback
   * @return possibly empty successful selection
   * @throws SportingResourceNotFoundException when club or season is unknown
   */
  public ConsultationViews.ClubTeams clubTeams(ClubSeasonRequest request) {
    return reads.clubTeams(request).orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads the current seasonal team summary without its participation detail collection.
   *
   * @param id exact seasonal team identity
   * @return detached current identity, season, classification and optional club
   * @throws SportingResourceNotFoundException when the team is currently unavailable
   */
  public ConsultationViews.TeamSummary teamSummary(UUID id) {
    return reads.teamSummary(id).orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads the exact seasonal team and its visible participations.
   *
   * @param id stable team identity
   * @return detached current team including optional club
   * @throws SportingResourceNotFoundException when currently unavailable
   */
  public ConsultationViews.TeamDetail team(UUID id) {
    return reads.team(id).orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads public pool context independently of official standings.
   *
   * @param id exact contextual pool identity
   * @return detached current pool
   * @throws SportingResourceNotFoundException when currently unavailable
   */
  public ConsultationViews.PoolDetail pool(UUID id) {
    return reads.pool(id).orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads current dated match facts without private source references.
   *
   * @param id exact encounter identity
   * @return permitted detail with independent freshness
   * @throws SportingResourceNotFoundException when hidden, dateless or unknown
   */
  public ConsultationViews.MatchDetail match(UUID id) {
    return reads.match(id).orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads currently available club artwork from its F02 owner.
   *
   * @param id stable club identity
   * @return validated immutable image bytes
   * @throws SportingResourceNotFoundException when owner or image is unavailable
   */
  public Image clubLogo(UUID id) {
    return owners
        .publicLogo(SportingProjectionChanges.Kind.CLUB, id)
        .orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads active division artwork under F02 admission.
   *
   * @param id exact division identity
   * @return current immutable image
   * @throws SportingResourceNotFoundException when inactive, missing or without artwork
   */
  public Image divisionLogo(UUID id) {
    return owners
        .publicLogo(SportingProjectionChanges.Kind.DIVISION, id)
        .orElseThrow(SportingResourceNotFoundException::new);
  }

  /**
   * Reads effective or automatic team artwork without bypassing current visibility.
   *
   * @param id exact seasonal team
   * @param selection canonical effective or automatic selection
   * @return selected immutable image
   * @throws SportingResourceNotFoundException when owner or selected image is unavailable
   */
  public Image teamLogo(UUID id, TeamLogoSelectionEnum selection) {
    return owners.publicTeamLogo(id, selection).orElseThrow(SportingResourceNotFoundException::new);
  }
}
