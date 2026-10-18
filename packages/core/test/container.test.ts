import { describe, expect, it } from "vitest";
import { asClass, asFunction, asValue } from "awilix";
import { createAppContainer } from "../src";

class Greeter {
  private readonly name: string;

  constructor({ name }: { name: string }) {
    this.name = name;
  }

  greet() {
    return `Cześć, ${this.name}!`;
  }
}

describe("createAppContainer", () => {
  it("wstrzykuje zależności jako obiekt (InjectionMode.PROXY)", () => {
    const container = createAppContainer<{ name: string; greeter: Greeter }>();
    container.register({
      name: asValue("Ala"),
      greeter: asClass(Greeter),
    });

    expect(container.cradle.greeter.greet()).toBe("Cześć, Ala!");
  });

  it("daje każdemu scope własne instancje zależności scoped", () => {
    const container = createAppContainer<{ name: string; greeter: Greeter }>();
    container.register({ greeter: asClass(Greeter).scoped() });

    const first = container.createScope();
    first.register({ name: asValue("Ala") });
    const second = container.createScope();
    second.register({ name: asValue("Olek") });

    expect(first.cradle.greeter).toBe(first.cradle.greeter);
    expect(first.cradle.greeter).not.toBe(second.cradle.greeter);
    expect(second.cradle.greeter.greet()).toBe("Cześć, Olek!");
  });

  it("w trybie strict nie pozwala singletonowi zależeć od zależności scoped", () => {
    const container = createAppContainer<{ name: string; greeter: Greeter }>();
    container.register({
      name: asFunction(() => "Ala").scoped(),
      greeter: asClass(Greeter).singleton(),
    });

    expect(() => container.cradle.greeter).toThrow();
  });
});
