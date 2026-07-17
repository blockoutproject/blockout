package com.blockout.mobilegateway.club.application;

import com.blockout.mobilegateway.shared.application.BinaryPart;

public interface MobileClubGateway {

    Snapshot find(String id);

    Snapshot update(String id, MobileClubWorkflow.UpdateCommand command, BinaryPart image);

    record Snapshot(
            String id,
            String rawName,
            String name,
            String address,
            String city,
            String email,
            String website,
            String logoUrl,
            Double latitude,
            Double longitude) {
    }
}
