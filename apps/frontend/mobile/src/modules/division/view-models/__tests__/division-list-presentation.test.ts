import type { DivisionResponse } from "@/src/shared/generated/models";
import { toDivisionListPresentation } from "@/src/modules/division/view-models/division-list-presentation";

const divisions = [
  { id: 3, name: "Régionale", active: true },
  { id: 1, name: "Elite", active: false },
  { id: 2, name: "Pré-nationale", active: true },
] as DivisionResponse[];

describe("toDivisionListPresentation", () => {
  it("filters by normalized copy and sorts by stable domain id", () => {
    expect(
      toDivisionListPresentation(divisions, "E", "Actives").map(({ id }) => id),
    ).toEqual([2, 3]);
  });

  it("keeps inactive divisions when that state is selected", () => {
    expect(
      toDivisionListPresentation(divisions, "", "Inactives").map(
        ({ id }) => id,
      ),
    ).toEqual([1]);
  });
});
