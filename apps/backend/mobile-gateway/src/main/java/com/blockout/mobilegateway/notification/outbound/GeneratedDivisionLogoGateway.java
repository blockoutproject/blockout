package com.blockout.mobilegateway.notification.outbound;

import com.blockout.config.client.api.DivisionsClient;
import com.blockout.mobilegateway.notification.application.DivisionLogoGateway;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Component
public class GeneratedDivisionLogoGateway implements DivisionLogoGateway {

    private final DivisionsClient divisions;

    public GeneratedDivisionLogoGateway(
            @Qualifier("configDivisionsUserClient") DivisionsClient divisions) {
        this.divisions = divisions;
    }

    @Override
    public Optional<String> findLogo(Long divisionId) {
        try {
            String logoUrl = divisions.getDivision(divisionId).getLogoUrl();
            return logoUrl == null || logoUrl.isBlank() ? Optional.empty() : Optional.of(logoUrl);
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }
}
