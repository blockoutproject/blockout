package com.blockout.search.config;

import com.blockout.search.shared.api.v2.SearchSecurityProblemWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final SearchSecurityProblemWriter securityProblems;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests((authorize) -> authorize
                        .anyRequest().authenticated()
                )
                .csrf(csrf -> csrf.disable())
                .cors(withDefaults())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(securityProblems)
                        .accessDeniedHandler(securityProblems)
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(withDefaults())
                        .authenticationEntryPoint(securityProblems)
                        .accessDeniedHandler(securityProblems)
                )
                .build();
    }
}
