import { describe, expect, it } from "vitest";
import { dependenciesStep } from "../../setup/steps/dependencies.ts";
import { contextFor, fakeSystem } from "../fake-system.ts";

describe("dependenciesStep", () => {
  it("uruchamia npm install przy każdym przebiegu", async () => {
    const system = fakeSystem();

    const result = await dependenciesStep.run(contextFor(system));

    expect(system.run).toHaveBeenCalledWith("npm", ["install"]);
    expect(result.status).toBe("done");
  });

  it("zgłasza błąd, gdy npm install się nie powiedzie", async () => {
    const system = fakeSystem();
    system.run.mockResolvedValue(1);

    const result = await dependenciesStep.run(contextFor(system));

    expect(result).toEqual({ status: "failed", message: "npm install zakończył się kodem 1." });
  });
});
