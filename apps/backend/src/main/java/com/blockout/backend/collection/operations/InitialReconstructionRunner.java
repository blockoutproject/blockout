package com.blockout.backend.collection.operations;

import com.blockout.backend.collection.application.service.CloseCollectionSeason;
import com.blockout.backend.collection.application.service.InitialReconstructionService;
import com.blockout.backend.collection.application.service.PrepareCollectionSources;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** One non-web operator action; its output is private operational evidence, never a public log. */
@Component
@Profile("initial-reconstruction")
@EnableConfigurationProperties(InitialReconstructionProperties.class)
@RequiredArgsConstructor
public class InitialReconstructionRunner implements ApplicationRunner {
  private final InitialReconstructionProperties inputs;
  private final InitialReconstructionService reconstruction;
  private final PrepareCollectionSources preparation;
  private final CloseCollectionSeason closure;
  private final JsonMapper json;

  /**
   * Executes exactly the configured owner operation and prints its current immutable result.
   *
   * @param args native Boot arguments already bound into validated configuration
   */
  @Override
  public void run(ApplicationArguments args) {
    Object result =
        switch (inputs.action()) {
          case PREPARE ->
              reconstruction.prepare(
                  inputs.operator(),
                  inputs.startYear(),
                  inputs.provider(),
                  inputs.organizerReference(),
                  inputs.candidateUrl());
          case CONFIRM ->
              preparation.confirmSeason(
                  inputs.operator(), inputs.sourceId(), inputs.revision(), inputs.label());
          case REQUEST ->
              reconstruction.request(
                  inputs.operator(),
                  inputs.seasonId(),
                  inputs.revision(),
                  inputs.sources(),
                  inputs.scopes() == null ? Set.of() : inputs.scopes());
          case REPORT ->
              reconstruction.report(
                  inputs.operator(), inputs.seasonId(), inputs.page(), inputs.size());
          case CLOSE ->
              closure.close(
                  inputs.operator(), inputs.seasonId(), inputs.revision(), inputs.label());
        };
    System.out.println(json.writeValueAsString(result));
  }
}
