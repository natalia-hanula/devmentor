import { describe, expect, it } from "vitest";
import { technologyCreateSchema } from "../src/validators/mentors/technology-create.schema";
import { technologyUpdateSchema } from "../src/validators/mentors/technology-update.schema";

describe("technologyCreateSchema", () => {
  it("przycina białe znaki i akceptuje poprawne dane", () => {
    expect(technologyCreateSchema.parse({ name: "  Rust ", slug: "rust" })).toEqual({ name: "Rust", slug: "rust" });
  });

  it("odrzuca slug z wielkimi literami lub spacjami", () => {
    expect(technologyCreateSchema.safeParse({ name: "Node", slug: "Node JS" }).success).toBe(false);
  });

  it("odrzuca nazwę dłuższą niż kolumna w bazie", () => {
    expect(technologyCreateSchema.safeParse({ name: "x".repeat(65), slug: "x" }).success).toBe(false);
  });

  it("pomija pola spoza schematu (brak mass assignment)", () => {
    const parsed = technologyCreateSchema.parse({ name: "Go", slug: "go", id: "hack", createdAt: "1999" });
    expect(parsed).toEqual({ name: "Go", slug: "go" });
  });
});

describe("technologyUpdateSchema", () => {
  it("pozwala na częściową zmianę", () => {
    expect(technologyUpdateSchema.parse({ name: "Go" })).toEqual({ name: "Go" });
  });
});
