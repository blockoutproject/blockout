package com.blockout.pools.pool.api.v1;

import com.blockout.shared.model.FollowerCountDeltaEnum;
import com.blockout.pools.pool.application.LegacyCreatePoolCommand;
import com.blockout.pools.pool.application.PoolFilter;
import com.blockout.pools.pool.application.PoolFollowerCommand;
import com.blockout.pools.pool.application.PoolFollowerProjectionService;
import com.blockout.pools.pool.application.PoolLifecycleService;
import com.blockout.pools.pool.application.PoolService;
import com.blockout.pools.pool.application.PoolView;
import com.blockout.pools.pool.application.UpdatePoolCommand;
import com.blockout.pools.shared.api.v1.LegacyPoolsJson;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/pools", produces = MediaType.APPLICATION_JSON_VALUE)
public class LegacyPoolController {

    private final PoolService service;
    private final PoolLifecycleService lifecycleService;
    private final PoolFollowerProjectionService followerProjectionService;
    private final LegacyPoolsJson json;

    @GetMapping
    public ResponseEntity<String> listPools(
            @RequestParam(name = "league_code", required = false) String leagueCode,
            @RequestParam(required = false) String season,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) List<Long> ids) throws JsonProcessingException {
        List<LegacyPoolResponse> response = service.findLegacy(new PoolFilter(leagueCode, season, active, ids))
                .stream().map(this::response).toList();
        return ResponseEntity.ok(json.write(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> getPool(@PathVariable Long id) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(response(service.getById(id))));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SCOPE_create:pools')")
    public ResponseEntity<String> createPool(@RequestBody String body) throws JsonProcessingException {
        JsonNode node = json.readTree(body);
        LegacyPoolRequest request = json.convert(node, LegacyPoolRequest.class);
        Long followersCount = node.has("followers_count") ? request.followersCount() : 0L;
        Boolean active = node.has("active") ? request.active() : true;
        PoolView saved = service.createLegacy(new LegacyCreatePoolCommand(
                request.id(), request.poolCode(), request.leagueCode(), request.season(), request.leagueName(),
                request.rawName(), request.name(), request.shortName(), request.divisionId(), request.format(),
                request.gender(), followersCount, active, request.createdAt(), request.lastUpdate()));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(saved.id()).toUri();
        return ResponseEntity.created(location).body(json.write(response(saved)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('SCOPE_update:pools')")
    public ResponseEntity<String> updatePool(@PathVariable Long id, @RequestBody String body)
            throws JsonProcessingException {
        LegacyPoolRequest request = json.read(body, LegacyPoolRequest.class);
        PoolView updated = service.update(id, new UpdatePoolCommand(
                request.poolCode(), request.leagueCode(), request.season(), request.leagueName(), request.rawName(),
                request.name(), request.shortName(), request.divisionId(), request.format(), request.gender(),
                request.active()));
        return ResponseEntity.ok(json.write(response(updated)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('SCOPE_delete:pools')")
    public ResponseEntity<Void> deactivatePool(@PathVariable Long id) {
        lifecycleService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{poolId}/followers/increment")
    @PreAuthorize("hasAuthority('SCOPE_follow:pools')")
    public ResponseEntity<String> incrementFollowers(
            @PathVariable Long poolId,
            @RequestParam(name = "user_id") Long userId) throws JsonProcessingException {
        return followerResponse(poolId, userId, FollowerCountDeltaEnum.INCREMENT);
    }

    @PostMapping("/{poolId}/followers/decrement")
    @PreAuthorize("hasAuthority('SCOPE_follow:pools')")
    public ResponseEntity<String> decrementFollowers(
            @PathVariable Long poolId,
            @RequestParam(name = "user_id") Long userId) throws JsonProcessingException {
        return followerResponse(poolId, userId, FollowerCountDeltaEnum.DECREMENT);
    }

    private ResponseEntity<String> followerResponse(Long poolId, Long userId, FollowerCountDeltaEnum delta)
            throws JsonProcessingException {
        PoolView updated = followerProjectionService.updateFollowers(new PoolFollowerCommand(poolId, userId, delta));
        return ResponseEntity.ok(json.write(response(updated)));
    }

    private LegacyPoolResponse response(PoolView view) {
        return new LegacyPoolResponse(view.id(), view.poolCode(), view.leagueCode(), view.season(), view.leagueName(),
                view.rawName(), view.name(), view.shortName(), view.divisionId(), view.format(), view.gender(),
                view.followersCount(), view.active(), view.createdAt(), view.lastUpdate());
    }

    record LegacyPoolRequest(
            Long id,
            String poolCode,
            String leagueCode,
            String season,
            String leagueName,
            String rawName,
            String name,
            String shortName,
            Long divisionId,
            FormatEnum format,
            GenderEnum gender,
            Long followersCount,
            Boolean active,
            LocalDateTime createdAt,
            LocalDateTime lastUpdate) {
    }

    record LegacyPoolResponse(
            Long id,
            String poolCode,
            String leagueCode,
            String season,
            String leagueName,
            String rawName,
            String name,
            String shortName,
            Long divisionId,
            FormatEnum format,
            GenderEnum gender,
            Long followersCount,
            Boolean active,
            LocalDateTime createdAt,
            LocalDateTime lastUpdate) {
    }
}
