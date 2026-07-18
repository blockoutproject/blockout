package com.blockout.config.rawmapping.application;

public class RawDivisionMappingNotFoundException extends RuntimeException {

    public RawDivisionMappingNotFoundException(Long id) {
        super("RawDivisionMapping not found with ID: " + id);
    }
}
