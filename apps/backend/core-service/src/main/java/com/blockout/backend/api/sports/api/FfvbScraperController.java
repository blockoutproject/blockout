package com.blockout.backend.api.sports.api;

import com.blockout.backend.api.user.api.generated.FfvbScraperApi;
import com.blockout.backend.sports.administration.application.FfvbAdministration;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Machine-only local configuration reads, authorized by the dedicated Spring route policy. */
@RestController
public class FfvbScraperController implements FfvbScraperApi {
  private final FfvbAdministration sports;
  private final FfvbMapper mapper;

  /**
   * Connects the machine read boundary to local sporting configuration.
   *
   * @param sports local owner reads
   * @param mapper generated HTTP projection
   */
  public FfvbScraperController(FfvbAdministration sports, FfvbMapper mapper) {
    this.sports = sports;
    this.mapper = mapper;
  }

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
