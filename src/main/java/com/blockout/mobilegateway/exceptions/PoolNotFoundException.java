package com.blockout.mobilegateway.exceptions;

public class PoolNotFoundException extends RuntimeException {
    public PoolNotFoundException(Long id) {
        super("Pool not found with id " + id);
    }
}
