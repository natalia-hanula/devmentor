import type { z } from "zod";
import { technologyCreateSchema } from "./technology-create.schema";

export const technologyUpdateSchema = technologyCreateSchema.partial();

export type TechnologyUpdateInput = z.infer<typeof technologyUpdateSchema>;
