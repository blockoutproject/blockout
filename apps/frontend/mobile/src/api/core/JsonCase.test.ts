import assert from "node:assert/strict";
import test from "node:test";
import {
    deserializeApiJson,
    serializeApiJson,
    serializeApiQuery,
} from "./JsonCase.ts";

test("currently serializes request bodies to snake_case", () => {
    assert.deepEqual(
        serializeApiJson({ clubId: "club-1", nestedValue: { shortName: "BO" } }),
        {
            club_id: "club-1",
            nested_value: { short_name: "BO" },
        },
    );
});

test("currently deserializes response bodies to camelCase", () => {
    assert.deepEqual(
        deserializeApiJson({ club_id: "club-1", nested_value: { short_name: "BO" } }),
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
