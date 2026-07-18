package com.blockout.matches.match.application;

public interface MatchUpdate {

    MatchSnapshot current();

    MatchChange prepare(MatchUpdatePlan plan);

    MatchSnapshot save();
}
