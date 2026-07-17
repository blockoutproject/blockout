package com.blockout.config.rawmapping.api.v1;

import com.blockout.config.rawmapping.application.LegacyRawDivisionMappingSeed;
import com.blockout.config.rawmapping.application.RawDivisionMappingService;
import com.blockout.config.rawmapping.application.RawDivisionMappingView;
import com.blockout.config.rawmapping.application.UpdateRawDivisionMappingCommand;
import com.blockout.config.shared.api.v1.LegacyConfigJson;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.net.URI;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping(value = "/api/v1/config/raw-divisions", produces = MediaType.APPLICATION_JSON_VALUE)
public class LegacyRawDivisionMappingController {

    private final RawDivisionMappingService service;
    private final LegacyConfigJson json;

    @PostMapping(consumes = {MediaType.APPLICATION_JSON_VALUE, "application/*+json"})
    @PreAuthorize("hasAuthority('SCOPE_create:raw_division_mapping')")
    public ResponseEntity<String> create(@RequestBody String body) throws JsonProcessingException {
        LegacyRawDivisionMapping request = json.read(body, LegacyRawDivisionMapping.class);
        RawDivisionMappingView created = service.createLegacy(new LegacyRawDivisionMappingSeed(
                request.id(), request.rawDivisionName(), request.divisionId(), request.format(), request.gender(),
                request.leagueCode(), request.season(), request.createdAt(), request.lastUpdate()));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(json.write(response(created)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_read:raw_division_mapping')")
    public ResponseEntity<String> list(
            @RequestParam(required = false, name = "league_code") String leagueCode,
            @RequestParam(required = false) String season) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(service.find(leagueCode, season).stream().map(this::response).toList()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SCOPE_read:raw_division_mapping')")
    public ResponseEntity<String> getById(@PathVariable Long id) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(response(service.getById(id))));
    }

    @PutMapping(path = "/{id}", consumes = {MediaType.APPLICATION_JSON_VALUE, "application/*+json"})
    @PreAuthorize("hasAuthority('SCOPE_update:raw_division_mapping')")
    public ResponseEntity<String> update(@PathVariable Long id, @RequestBody String body)
            throws JsonProcessingException {
        LegacyRawDivisionMappingUpdate request = json.read(body, LegacyRawDivisionMappingUpdate.class);
        RawDivisionMappingView updated = service.update(
                id, new UpdateRawDivisionMappingCommand(request.divisionId(), request.format(), request.gender()));
        return ResponseEntity.ok(json.write(response(updated)));
    }

    private LegacyRawDivisionMapping response(RawDivisionMappingView view) {
        return new LegacyRawDivisionMapping(
                view.id(), view.rawDivisionName(), view.divisionId(), view.format(), view.gender(), view.leagueCode(),
                view.season(), view.createdAt(), view.lastUpdate());
    }

    record LegacyRawDivisionMapping(
            Long id,
            String rawDivisionName,
            Long divisionId,
            FormatEnum format,
            GenderEnum gender,
            String leagueCode,
            String season,
            LocalDateTime createdAt,
            LocalDateTime lastUpdate) {
    }

    record LegacyRawDivisionMappingUpdate(Long divisionId, FormatEnum format, GenderEnum gender) {
    }
}
