import { describe, expect, it } from "vitest";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from "../src";

describe("hierarchia AppError", () => {
  it.each([
    [new ValidationError(), 400, "VALIDATION_ERROR", "Nieprawidłowe dane"],
    [new UnauthorizedError(), 401, "UNAUTHORIZED", "Wymagane zalogowanie"],
    [new ForbiddenError(), 403, "FORBIDDEN", "Brak uprawnień"],
    [new NotFoundError(), 404, "NOT_FOUND", "Nie znaleziono zasobu"],
    [new ConflictError(), 409, "CONFLICT", "Konflikt z istniejącymi danymi"],
    [new TooManyRequestsError(), 429, "TOO_MANY_REQUESTS", "Za dużo prób. Spróbuj za chwilę."],
    [new ServiceUnavailableError(), 503, "SERVICE_UNAVAILABLE", "Usługa jest chwilowo niedostępna"],
  ])("%s ma status %i, kod %s i domyślny komunikat", (error, status, code, message) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
    expect(error.name).toBe(error.constructor.name);
  });

  it("przyjmuje własny komunikat, fieldErrors i przyczynę", () => {
    const cause = new Error("ECONNREFUSED");

    const validation = new ValidationError("Złe dane", { name: ["Wymagane"] });
    const unavailable = new ServiceUnavailableError("Baza nie działa", { cause });

    expect(validation.fieldErrors).toEqual({ name: ["Wymagane"] });
    expect(new UnauthorizedError("x").message).toBe("x");
    expect(new ForbiddenError("x").message).toBe("x");
    expect(new NotFoundError("x").message).toBe("x");
    expect(new ConflictError("x").message).toBe("x");
    expect(new TooManyRequestsError("x").message).toBe("x");
    expect(unavailable.cause).toBe(cause);
  });
});
