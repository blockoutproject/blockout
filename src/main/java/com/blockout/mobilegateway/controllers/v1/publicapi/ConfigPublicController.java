package com.blockout.mobilegateway.controllers.v1.publicapi;

import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.config.LegalDocumentDTO;
import com.blockout.mobilegateway.services.ConfigService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/config")
public class ConfigPublicController {

    private final ConfigService configService;

    @GetMapping("/divisions")
    public ResponseEntity<List<DivisionDTO>> listAll() {
        return ResponseEntity.ok(configService.listDivisions());
    }

    @GetMapping("/divisions/{id}")
    public ResponseEntity<DivisionDTO> getDivisionById(@PathVariable Long id) {
        return ResponseEntity.ok(configService.getDivisionById(id));
    }

    @GetMapping("/legal/{type}")
    public ResponseEntity<LegalDocumentDTO> getLegalDocument(@PathVariable String type) {
        LegalDocumentDTO doc = configService.getLegalDocument(type);
        return ResponseEntity.ok(doc);
    }
}