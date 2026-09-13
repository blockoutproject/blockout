package com.blockout.backend.api.sports.api;

import com.blockout.backend.api.user.api.generated.FfvbScraperApi;
import com.blockout.backend.sports.administration.application.FfvbAdministration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Machine-only local configuration reads, authorized by the dedicated Spring route policy. */
@RestController
@RequiredArgsConstructor
public class FfvbScraperController implements FfvbScraperApi {
  /** Local owner reads. */
  private final FfvbAdministration sports;

  /** Generated HTTP projection. */
  private final FfvbMapper mapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> getScraperFfvbConfiguration() {
    return FfvbAdministrationController.ok(mapper.toResponse(sports.configuration()));
  }

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<?> getScraperFfvbMappings(Integer page, Integer pageSize) {
    return FfvbAdministrationController.ok(
        mapper.toMappingPage(sports.mappings(page, pageSize, true, true)));
  }
}
