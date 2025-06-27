package com.blockout.config.exceptions;

public class RawDivisionMappingNotFoundException extends EntityNotFoundException {
    public RawDivisionMappingNotFoundException(Long id) {
        super("RawDivisionMapping not found with ID: " + id);
    }
}
