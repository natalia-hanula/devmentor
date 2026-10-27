import { z } from "zod";
import { withScope } from "../container/container";
import type { RequestCradle } from "../container/cradle";
import { apiHandler, parseJsonBody, type RouteHandler } from "./api-handler";
import { requireSession } from "./auth";
import { ValidationError } from "./errors";

export interface CrudService<TDto, TCreate, TUpdate> {
  list(): Promise<TDto[]>;
  create(input: TCreate): Promise<TDto>;
  update(id: string, input: TUpdate): Promise<TDto>;
  delete(id: string): Promise<void>;
}

/** `"public"` trzeba wpisać jawnie; domyślnie każda operacja wymaga sesji (fail closed). */
export type AccessRule = "public" | ((request: Request) => Promise<unknown>);

type CrudServiceKey = {
  [K in keyof RequestCradle]: RequestCradle[K] extends CrudService<unknown, never, never> ? K : never;
}[keyof RequestCradle];

export interface CrudRouteConfig<K extends CrudServiceKey, C extends z.ZodType, U extends z.ZodType> {
  /** Klucz serwisu w `RequestCradle`. */
  service: K;
  createSchema: C;
  updateSchema: U;
  access?: { read?: AccessRule; write?: AccessRule };
}

/**
 * Trasy CRUD z konfiguracji: `GET` (lista), `POST` (tworzenie), `PUT ?id=` (zmiana), `DELETE ?id=`.
 * Plik `route.ts` zostaje konfiguracją: `export const { GET, POST, PUT, DELETE } = makeCrudRoute({ ... })`.
 * Przepływy, które nie są CRUD-em (rezerwacja, płatność), używają `apiHandler` bezpośrednio.
 */
export function makeCrudRoute<K extends CrudServiceKey, C extends z.ZodType, U extends z.ZodType>(
  config: CrudRouteConfig<K, C, U>,
): Record<"GET" | "POST" | "PUT" | "DELETE", RouteHandler> {
  const read = config.access?.read ?? requireSession;
  const write = config.access?.write ?? requireSession;
  const service = (cradle: RequestCradle) =>
    cradle[config.service] as CrudService<unknown, z.infer<C>, z.infer<U>>;

  return {
    GET: apiHandler(async (request) => {
      await authorize(read, request);
      return withScope((cradle) => service(cradle).list());
    }),
    POST: apiHandler(
      async (request) => {
        await authorize(write, request);
        const input = await parseJsonBody(request, config.createSchema);
        return withScope((cradle) => service(cradle).create(input));
      },
      { successStatus: 201 },
    ),
    PUT: apiHandler(async (request) => {
      await authorize(write, request);
      const { id } = parseIdQuery(request);
      const input = await parseJsonBody(request, config.updateSchema);
      return withScope((cradle) => service(cradle).update(id, input));
    }),
    DELETE: apiHandler(async (request) => {
      await authorize(write, request);
      const { id } = parseIdQuery(request);
      await withScope((cradle) => service(cradle).delete(id));
      return { id };
    }),
  };
}

async function authorize(rule: AccessRule, request: Request): Promise<void> {
  if (rule === "public") {
    return;
  }
  await rule(request);
}

const uuidParamSchema = z.uuid("Nieprawidłowy identyfikator");

/** Parametr zapytania jako UUID (400 z `fieldErrors` pod nazwą parametru) — także dla tras przepływów, które nie są CRUD-em. */
export function parseUuidParam(request: Request, name: string): string {
  const result = uuidParamSchema.safeParse(new URL(request.url).searchParams.get(name));
  if (!result.success) {
    throw new ValidationError(undefined, { [name]: result.error.issues.map((issue) => issue.message) });
  }
  return result.data;
}

/** `?id=` jako UUID — wspólne dla tras `DELETE`/`PUT`. */
export function parseIdQuery(request: Request): { id: string } {
  return { id: parseUuidParam(request, "id") };
}
