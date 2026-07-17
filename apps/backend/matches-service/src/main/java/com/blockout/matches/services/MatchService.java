package com.blockout.matches.services;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.repositories.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Transitional lookup retained only by the legacy event-test adapter.
 * MRG-370 owns removal of the test transport and its entity-facing lookup.
 */
@Service
@RequiredArgsConstructor
public class MatchService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchService.class);

    private final MatchRepository matchRepository;

    public Match getMatchByIdInternal(Long id) {
        return matchRepository.findById(id).orElseThrow(() -> {
            LOGGER.warn("Match not found", keyValue("matchId", id));
            return new MatchNotFoundException(id);
        });
    }

}
