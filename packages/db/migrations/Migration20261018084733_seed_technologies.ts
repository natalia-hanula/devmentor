import { Migration } from '@mikro-orm/migrations';

// Słownik startowy technologii — stałe dane referencyjne (nie dane od użytkownika), stąd literały w SQL.
export class Migration20261018084733_seed_technologies extends Migration {

  override name = 'Migration20261018084733_seed_technologies';

  override up(): void | Promise<void> {
    this.addSql(`insert into "technologies" ("id", "created_at", "updated_at", "name", "slug") values
      (gen_random_uuid(), now(), now(), 'TypeScript', 'typescript'),
      (gen_random_uuid(), now(), now(), 'JavaScript', 'javascript'),
      (gen_random_uuid(), now(), now(), 'React', 'react'),
      (gen_random_uuid(), now(), now(), 'Next.js', 'nextjs'),
      (gen_random_uuid(), now(), now(), 'Node.js', 'nodejs'),
      (gen_random_uuid(), now(), now(), 'Python', 'python'),
      (gen_random_uuid(), now(), now(), 'Java', 'java'),
      (gen_random_uuid(), now(), now(), 'PostgreSQL', 'postgresql')
      on conflict do nothing;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`delete from "technologies" where "slug" in ('typescript', 'javascript', 'react', 'nextjs', 'nodejs', 'python', 'java', 'postgresql');`);
  }

}
