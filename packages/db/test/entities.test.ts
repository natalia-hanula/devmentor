import { describe, expect, it } from "vitest";
import { entities, Technology } from "../src";
import { TechnologySchema } from "../src/entities/mentors/technology.entity";

type Hook = (entity: unknown, em: unknown) => unknown;

function hook(property: string, kind: "onCreate" | "onUpdate"): Hook {
  const meta = TechnologySchema.meta.properties as unknown as Record<string, Record<string, Hook>>;
  return meta[property][kind];
}

describe("encje", () => {
  it("rejestruje Technology w liście encji, w tabeli technologies", () => {
    expect(entities).toContain(TechnologySchema);
    expect(TechnologySchema.meta.tableName).toBe("technologies");
    expect(TechnologySchema.meta.class).toBe(Technology);
  });

  it("baseProperties generują UUID i znaczniki czasu przy tworzeniu oraz odświeżają updatedAt", () => {
    const id = hook("id", "onCreate")({}, {});
    const createdAt = hook("createdAt", "onCreate")({}, {});
    const updatedAtOnCreate = hook("updatedAt", "onCreate")({}, {});
    const updatedAtOnUpdate = hook("updatedAt", "onUpdate")({}, {});

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(createdAt).toBeInstanceOf(Date);
    expect(updatedAtOnCreate).toBeInstanceOf(Date);
    expect(updatedAtOnUpdate).toBeInstanceOf(Date);
  });
});
