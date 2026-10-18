export type FieldErrors = Record<string, string[]>;

/**
 * Baza typowanych błędów domenowych. Serwisy rzucają wyłącznie te błędy;
 * `apiHandler` zamienia je na status HTTP i kopertę JSON.
 */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = "VALIDATION_ERROR";

  constructor(
    message = "Nieprawidłowe dane",
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = "UNAUTHORIZED";

  constructor(message = "Wymagane zalogowanie") {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = "FORBIDDEN";

  constructor(message = "Brak uprawnień") {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "NOT_FOUND";

  constructor(message = "Nie znaleziono zasobu") {
    super(message);
  }
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = "CONFLICT";

  constructor(message = "Konflikt z istniejącymi danymi") {
    super(message);
  }
}

/** Zależność infrastrukturalna (np. baza) jest niedostępna. Logowany przez `apiHandler`. */
export class ServiceUnavailableError extends AppError {
  readonly status = 503;
  readonly code = "SERVICE_UNAVAILABLE";

  constructor(message = "Usługa jest chwilowo niedostępna", options?: ErrorOptions) {
    super(message, options);
  }
}
