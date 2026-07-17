package com.blockout.mobilegateway.controllers.v1;

import com.blockout.mobilegateway.models.dto.notification.RegisterPushTokenRequestDTO;
import com.blockout.mobilegateway.models.dto.search.ClubSearchDocDTO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LegacyTransportFixtureController {

    @GetMapping("/legacy/club")
    public ClubSearchDocDTO club() {
        return ClubSearchDocDTO.builder().logoUrl("club.png").build();
    }

    @PostMapping("/legacy/push-token")
    public RegisterPushTokenRequestDTO pushToken(@RequestBody RegisterPushTokenRequestDTO request) {
        return request;
    }
}
