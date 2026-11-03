import type { MatchResultResponse } from "../../../../.generated/schemas/index.zod";
import {
  matchHeaderLabel,
  matchStatusLabel,
} from "../model/match-presentation";
import { matchDetail } from "../test-support/consultation-data";

it.each([
  { result: { state: "final", homeSets: 0, awaySets: 3 }, expected: "0 – 3" },
  { result: { state: "final", homeSets: 3, awaySets: 0 }, expected: "3 – 0" },
  { result: { state: "final", homeSets: 0 }, expected: "0 – -" },
  { result: { state: "final", awaySets: 3 }, expected: "- – 3" },
  {
    result: { state: "final", specialLabel: "Forfait (F)" },
    expected: "Forfait (F)",
  },
  {
    result: {
      state: "final",
      homeSets: 3,
      awaySets: 0,
      specialLabel: "Forfait (F)",
    },
    expected: "3 – 0",
  },
  { result: { state: "final" }, expected: "- – -" },
] satisfies {
  result: Omit<MatchResultResponse, "observedAt">;
  expected: string;
}[])(
  "preserves accepted final navigation facts: $expected",
  ({ result, expected }) => {
    // Given
    const match = matchDetail().match;
    match.result = { ...result, observedAt: match.schedule.observedAt };

    // When
    const compact = matchHeaderLabel(match);

    // Then
    expect(compact).toBe(expected);
    expect(matchStatusLabel(match)).toBe("Terminé");
  },
);

it.each([
  { state: "provisional", expected: "Score provisoire" },
  { state: "unconfirmed", expected: "Résultat non confirmé" },
] as const)(
  "keeps $state totals out of a definitive compact score",
  ({ state, expected }) => {
    // Given
    const match = matchDetail().match;
    match.category = "completed";
    match.result = {
      state,
      homeSets: 3,
      awaySets: 0,
      specialLabel: "Forfait (F)",
      observedAt: match.schedule.observedAt,
    };

    // When
    const compact = matchHeaderLabel(match);

    // Then
    expect(compact).toBe(expected);
    expect(matchStatusLabel(match)).toBe(expected);
  },
);

it.each([
  { category: "upcoming", expected: "À venir" },
  { category: "completed", expected: "Résultat indisponible" },
] as const)(
  "shares the existing $category status when no result was published",
  ({ category, expected }) => {
    // Given
    const match = matchDetail().match;
    match.category = category;

    // When
    const compact = matchHeaderLabel(match);

    // Then
    expect(compact).toBe(expected);
    expect(matchStatusLabel(match)).toBe(expected);
  },
);
