package com.blockout.mobilegateway.team.api;

import com.blockout.mobilegateway.api.TeamSecureApi;
import com.blockout.mobilegateway.api.models.TeamDetailsResponse;
import com.blockout.mobilegateway.api.models.UpdateTeamRequest;
import com.blockout.mobilegateway.team.api.mappers.TeamApiMapper;
import com.blockout.mobilegateway.team.application.TeamApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/** Exposes secured Team operations through the generated mobile contract. */
@RestController
@RequiredArgsConstructor
public class TeamSecureController implements TeamSecureApi {

  private final TeamApplicationService teamService;
  private final TeamApiMapper mapper;
  private final ObjectMapper objectMapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<TeamDetailsResponse> updateTeam(Long id, String data, MultipartFile image) {
    try {
      UpdateTeamRequest request = objectMapper.readValue(data, UpdateTeamRequest.class);
      return ResponseEntity.ok(
          mapper.toDetailsResponse(teamService.updateTeam(id, mapper.toCommand(request), image)));
    } catch (JacksonException exception) {
      throw new IllegalArgumentException("Invalid multipart JSON data", exception);
    }
  }
}
