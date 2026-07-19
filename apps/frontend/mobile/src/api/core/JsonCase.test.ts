import assert from "node:assert/strict";
import test from "node:test";
import {
    deserializeApiJson,
    serializeApiJson,
    serializeApiQuery,
} from "./JsonCase.ts";

test("keeps camelCase request bodies unchanged", () => {
    assert.deepEqual(
        serializeApiJson({ clubId: "club-1", nestedValue: { shortName: "BO" } }),
        {
            clubId: "club-1",
            nestedValue: { shortName: "BO" },
        },
    );
});

test("keeps camelCase response bodies unchanged", () => {
    assert.deepEqual(
        deserializeApiJson({ clubId: "club-1", nestedValue: { shortName: "BO" } }),
        {
            clubId: "club-1",
            nestedValue: { shortName: "BO" },
        },
    );
});

test("keeps query serialization separate from JSON bodies", () => {
    assert.deepEqual(serializeApiQuery({ entityType: "TEAM", entityId: "10" }), {
        entity_type: "TEAM",
        entity_id: "10",
    });
});
