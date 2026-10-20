import { defineEntity, p } from "@mikro-orm/postgresql";
import { TECHNOLOGY_NAME_MAX_LENGTH, TECHNOLOGY_SLUG_MAX_LENGTH } from "../../constants";
import { baseProperties, pinEntityName } from "../base.entity";

const TechnologySchema = defineEntity({
  name: "Technology",
  tableName: "technologies",
  properties: {
    ...baseProperties,
    name: p.string().length(TECHNOLOGY_NAME_MAX_LENGTH).unique(),
    slug: p.string().length(TECHNOLOGY_SLUG_MAX_LENGTH).unique(),
  },
});

export class Technology extends TechnologySchema.class {}
pinEntityName(Technology, "Technology");
TechnologySchema.setClass(Technology);

export { TechnologySchema };
