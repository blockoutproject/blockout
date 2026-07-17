package com.blockout.mobilegateway.config;

import com.blockout.mobilegateway.shared.api.MobileGatewaySecurityProblemWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtDebugFilter jwtDebugFilter;
    private final MobileGatewaySecurityProblemWriter mobileGatewaySecurityProblemWriter;

    @Bean
    @Order(1)
    public SecurityFilterChain publicChain(HttpSecurity http) throws Exception {
        return http
                .securityMatcher("/api/v1/mobile/public/**", "/api/v2/mobile/public/**")
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .addFilterBefore(jwtDebugFilter, UsernamePasswordAuthenticationFilter.class)
                .csrf(csrf -> csrf.disable())
                .cors(withDefaults())
                .build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain secureChain(HttpSecurity http) throws Exception {
        return http
                .securityMatcher("/api/v1/mobile/secure/**", "/api/v2/mobile/secure/**")
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                .addFilterBefore(jwtDebugFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(mobileGatewaySecurityProblemWriter)
                        .accessDeniedHandler(mobileGatewaySecurityProblemWriter))
                .oauth2ResourceServer(oauth -> oauth
                        .authenticationEntryPoint(mobileGatewaySecurityProblemWriter)
                        .accessDeniedHandler(mobileGatewaySecurityProblemWriter)
                        .jwt(withDefaults()))
                .csrf(csrf -> csrf.disable())
                .cors(withDefaults())
                .build();
    }
}
