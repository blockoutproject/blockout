package com.blockout.mobilegateway.team.infrastructure;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import com.blockout.mobilegateway.shared.infrastructure.http.MultipartBodyBuilder;
import com.blockout.mobilegateway.team.application.commands.UpdateTeamCommand;
import com.blockout.mobilegateway.team.application.views.TeamDetailsView;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class TeamInternalClient {

  private final ApiClientProperties apiClientProperties;
  private final InternalApiClient internalApiClient;
  private final ObjectMapper objectMapper;
  private final TeamContractMapper contractMapper;

  private String baseUrl() {
    return apiClientProperties.getTeam().getUrl();
  }

  @Cacheable(value = "teamById", key = "#id")
  public TeamDetailsView getTeamById(Long id) {
    String url =
        UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(id.toString())
            .build()
            .toUriString();

    var response =
        internalApiClient.get(
            url,
            com.blockout.mobilegateway.team.infrastructure.contract.models.TeamInternalResponse
                .class);
    return contractMapper.toResponse(response.getBody());
  }

  public List<TeamDetailsView> getTeamsByIds(Set<Long> ids) {
    if (ids == null || ids.isEmpty()) return Collections.emptyList();

    String url =
        UriComponentsBuilder.fromUriString(baseUrl())
            .queryParam("ids", ids)
            .queryParam("active", true)
            .build()
            .toUriString();

    var response =
        internalApiClient.get(
            url,
            com.blockout.mobilegateway.team.infrastructure.contract.models.TeamInternalResponse[]
                .class);
    var body = response.getBody();
    return body != null
        ? Arrays.stream(body).map(contractMapper::toResponse).toList()
        : Collections.emptyList();
  }

  @Cacheable(value = "teamsByClubId", key = "#clubId")
  public List<TeamDetailsView> getTeamsByClubId(String clubId) {
    String url =
        UriComponentsBuilder.fromUriString(baseUrl())
            .queryParam("clubId", clubId)
            .queryParam("active", true)
            .build()
            .toUriString();

    var response =
        internalApiClient.get(
            url,
            com.blockout.mobilegateway.team.infrastructure.contract.models.TeamInternalResponse[]
                .class);
    var body = response.getBody();
    return body != null
        ? Arrays.stream(body).map(contractMapper::toResponse).toList()
        : Collections.emptyList();
  }

  @Caching(
      put = {@CachePut(value = "teamById", key = "#id")},
      evict = {
        @CacheEvict(value = "teamsByClubId", key = "#result.clubId", condition = "#result != null")
      })
  public TeamDetailsView updateTeam(Long id, UpdateTeamCommand command, MultipartFile image) {
    String url =
        UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment(id.toString())
            .build()
            .toUriString();

    MultiValueMap<String, Object> body =
        MultipartBodyBuilder.buildMultipart(
            objectMapper, contractMapper.toInternalRequest(command), image);

    var response =
        internalApiClient.putMultipart(
            url,
            body,
            com.blockout.mobilegateway.team.infrastructure.contract.models.TeamInternalResponse
                .class);
    return contractMapper.toResponse(response.getBody());
  }
}
