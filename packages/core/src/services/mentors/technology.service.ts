import { Technology, UniqueConstraintViolationException, type EntityManager } from "@devmentor/db";
import { ConflictError, NotFoundError } from "../../http/errors";
import type { TechnologyCreateInput } from "../../validators/mentors/technology-create.schema";
import type { TechnologyUpdateInput } from "../../validators/mentors/technology-update.schema";

/** Kształt zwracany na zewnątrz — jawna lista pól zamiast serializacji encji. */
export interface TechnologyDto {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export class TechnologyService {
  private readonly em: EntityManager;

  constructor({ em }: { em: EntityManager }) {
    this.em = em;
  }

  async list(): Promise<TechnologyDto[]> {
    const technologies = await this.em.find(Technology, {}, { orderBy: { name: "asc" } });
    return technologies.map(toDto);
  }

  async create(input: TechnologyCreateInput): Promise<TechnologyDto> {
    const technology = this.em.create(Technology, { name: input.name, slug: input.slug });
    await this.flushOrConflict();
    return toDto(technology);
  }

  async update(id: string, input: TechnologyUpdateInput): Promise<TechnologyDto> {
    const technology = await this.findOrFail(id);
    if (input.name !== undefined) technology.name = input.name;
    if (input.slug !== undefined) technology.slug = input.slug;
    await this.flushOrConflict();
    return toDto(technology);
  }

  async delete(id: string): Promise<void> {
    const technology = await this.findOrFail(id);
    this.em.remove(technology);
    await this.em.flush();
  }

  private async findOrFail(id: string): Promise<Technology> {
    const technology = await this.em.findOne(Technology, { id });
    if (!technology) {
      throw new NotFoundError("Nie znaleziono technologii");
    }
    return technology;
  }

  /** Unikalność nazwy i sluga pilnuje baza (constraint), nie sprawdzenie przed zapisem — bez wyścigu. */
  private async flushOrConflict(): Promise<void> {
    try {
      await this.em.flush();
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictError("Technologia o tej nazwie lub slugu już istnieje");
      }
      throw error;
    }
  }
}

function toDto(technology: Technology): TechnologyDto {
  return {
    id: technology.id,
    name: technology.name,
    slug: technology.slug,
    createdAt: technology.createdAt.toISOString(),
    updatedAt: technology.updatedAt.toISOString(),
  };
}
