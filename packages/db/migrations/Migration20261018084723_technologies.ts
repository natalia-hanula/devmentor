import { Migration } from '@mikro-orm/migrations';

export class Migration20261018084723_technologies extends Migration {

  override name = 'Migration20261018084723_technologies';

  override up(): void | Promise<void> {
    this.addSql(`create table "technologies" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(64) not null, "slug" varchar(64) not null, primary key ("id"));`);
    this.addSql(`alter table "technologies" add constraint "technologies_name_unique" unique ("name");`);
    this.addSql(`alter table "technologies" add constraint "technologies_slug_unique" unique ("slug");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "technologies" cascade;`);
  }

}
