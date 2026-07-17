package com.blockout.mobilegateway.club.application;

import com.blockout.mobilegateway.exceptions.InconsistentStateException;
import com.blockout.mobilegateway.shared.application.BinaryPart;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MobileClubWorkflow {

    private final MobileClubGateway clubs;

    public ClubView get(String id) {
        return view(required(clubs.find(id), id));
    }

    public ClubView update(String id, UpdateCommand command, BinaryPart image) {
        return view(clubs.update(id, command, image));
    }

    private MobileClubGateway.Snapshot required(MobileClubGateway.Snapshot club, String id) {
        if (club == null) {
            throw new InconsistentStateException("Club not found with ID " + id);
        }
        return club;
    }

    static ClubView view(MobileClubGateway.Snapshot value) {
        return new ClubView(value.id(), value.rawName(), value.name(), value.address(), value.city(), value.email(),
                value.website(), value.logoUrl(), value.latitude(), value.longitude());
    }

    public record UpdateCommand(String name, boolean removeLogo) {
    }

    public record ClubView(
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
