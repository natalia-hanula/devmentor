import { makeCrudRoute } from "@devmentor/core";
import { technologyCreateSchema } from "@devmentor/core/validators/mentors/technology-create.schema";
import { technologyUpdateSchema } from "@devmentor/core/validators/mentors/technology-update.schema";

// Słownik technologii jest publiczny do odczytu; zapisy wymagają sesji (domyślnie — fail closed).
export const { GET, POST, PUT, DELETE } = makeCrudRoute({
  service: "technologyService",
  createSchema: technologyCreateSchema,
  updateSchema: technologyUpdateSchema,
  access: { read: "public" },
});
