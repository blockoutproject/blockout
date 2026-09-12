package com.blockout.backend.api.user.api;

import com.blockout.backend.api.security.api.ApiRoutePolicy;
import com.blockout.backend.identity.config.IdentityProfileConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(NativeUserProperties.class)
@Import(IdentityProfileConfiguration.class)
public class UserRouteConfiguration {
  @Bean
  ApiRoutePolicy userRoutePolicy() {
    return requests ->
        requests
            .requestMatchers(HttpMethod.GET, "/api/v2/users/me")
            .authenticated()
            .requestMatchers(HttpMethod.POST, "/api/v2/users/me")
            .authenticated();
  }
}
