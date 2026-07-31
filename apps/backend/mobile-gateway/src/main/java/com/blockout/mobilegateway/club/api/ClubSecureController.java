package com.blockout.mobilegateway.club.api;

import com.blockout.mobilegateway.api.ClubSecureApi;
import com.blockout.mobilegateway.api.models.ClubResponse;
import com.blockout.mobilegateway.api.models.UpdateClubRequest;
import com.blockout.mobilegateway.club.api.mappers.ClubApiMapper;
import com.blockout.mobilegateway.club.application.ClubApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/** Exposes secured Club operations through the generated mobile contract. */
@RestController
@RequiredArgsConstructor
public class ClubSecureController implements ClubSecureApi {

  private final ClubApplicationService clubService;
  private final ClubApiMapper mapper;
  private final ObjectMapper objectMapper;

  /** {@inheritDoc} */
  @Override
  public ResponseEntity<ClubResponse> updateClub(String id, String data, MultipartFile image) {
    try {
      UpdateClubRequest request = objectMapper.readValue(data, UpdateClubRequest.class);
      return ResponseEntity.ok(
          mapper.toResponse(clubService.updateClub(id, mapper.toCommand(request), image)));
    } catch (JacksonException exception) {
      throw new IllegalArgumentException("Invalid multipart JSON data", exception);
    }
  }
}
