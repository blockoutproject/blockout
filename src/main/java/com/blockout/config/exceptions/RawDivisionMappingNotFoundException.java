package com.blockout.config.exceptions;

public class RawDivisionMappingNotFoundException extends RuntimeException {
    public RawDivisionMappingNotFoundException(Long id) {
        super("RawDivisionMapping not found with id " + id);
    }
}
