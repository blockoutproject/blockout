package com.blockout.config.legal.api.v1;

import com.blockout.config.legal.application.LegalDocumentService;
import com.fasterxml.jackson.core.JsonProcessingException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/api/v1/config/legal", produces = MediaType.APPLICATION_JSON_VALUE)
public class LegacyLegalDocumentController {

    private final LegalDocumentService service;
    private final LegacyLegalDocumentJson json;

    @GetMapping("/{type}")
    public ResponseEntity<String> getLegalDocument(@PathVariable String type) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(service.getByType(type)));
    }

    @PutMapping(value = "/{type}", consumes = {MediaType.APPLICATION_JSON_VALUE, "application/*+json"})
    @PreAuthorize("hasAuthority('SCOPE_update:legal')")
    public ResponseEntity<String> updateLegalDocument(
            @PathVariable String type,
            @RequestBody String body) throws JsonProcessingException {
        return ResponseEntity.ok(json.write(service.update(type, json.readUpdate(body))));
    }
}
