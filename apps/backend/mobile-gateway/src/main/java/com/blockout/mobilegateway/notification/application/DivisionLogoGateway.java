package com.blockout.mobilegateway.notification.application;

import java.util.Optional;

public interface DivisionLogoGateway {

    Optional<String> findLogo(Long divisionId);
}
