package com.blockout.config.division.application;

public interface DivisionUpdate {

    DivisionView current();

    DivisionChange apply(DivisionUpdatePlan plan);
}
