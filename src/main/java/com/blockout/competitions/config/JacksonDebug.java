package com.blockout.competitions.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;

@Component
public class JacksonDebug {

    @Autowired
    private ObjectMapper mapper;

    @PostConstruct
    public void logJacksonNaming() {
        System.out.println("⚙️ Jackson naming strategy = " + mapper.getPropertyNamingStrategy());
    }
}
