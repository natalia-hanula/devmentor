import { Migration } from '@mikro-orm/migrations';

export class Migration20261020151400_auth_users_and_roles extends Migration {

  override name = 'Migration20261020151400_auth_users_and_roles';

  override up(): void | Promise<void> {
    this.addSql(`create table "users" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "email" varchar(254) not null, "email_verified_at" timestamptz null, "display_name" varchar(80) not null, "session_version" int not null default 1, primary key ("id"));`);
    this.addSql(`alter table "users" add constraint "users_email_unique" unique ("email");`);

    this.addSql(`create table "user_roles" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "role" text not null, "granted_by_id" uuid null, primary key ("id"));`);
    this.addSql(`alter table "user_roles" add constraint "user_roles_user_id_role_unique" unique ("user_id", "role");`);

    this.addSql(`alter table "user_roles" add constraint "user_roles_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;`);
    this.addSql(`alter table "user_roles" add constraint "user_roles_granted_by_id_foreign" foreign key ("granted_by_id") references "users" ("id") on delete set null;`);
    this.addSql(`alter table "user_roles" add constraint "user_roles_role_check" check ("role" in ('mentee', 'mentor', 'operator'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "user_roles" drop constraint "user_roles_user_id_foreign";`);
    this.addSql(`alter table "user_roles" drop constraint "user_roles_granted_by_id_foreign";`);

    this.addSql(`drop table if exists "users" cascade;`);
    this.addSql(`drop table if exists "user_roles" cascade;`);
  }

}
