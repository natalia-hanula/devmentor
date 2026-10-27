import { Migration } from '@mikro-orm/migrations';

export class Migration20261027102216_auth_mentor_invitations extends Migration {

  override name = 'Migration20261027102216_auth_mentor_invitations';

  override up(): void | Promise<void> {
    this.addSql(`create table "mentor_invitations" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "email" varchar(254) not null, "token_hash" char(64) not null, "expires_at" timestamptz not null, "created_by_id" uuid null, "revoked_at" timestamptz null, "accepted_at" timestamptz null, "accepted_by_id" uuid null, primary key ("id"));`);
    this.addSql(`alter table "mentor_invitations" add constraint "mentor_invitations_token_hash_unique" unique ("token_hash");`);
    this.addSql(`create unique index "mentor_invitations_email_active_unique" on "mentor_invitations" ("email") where "accepted_at" is null and "revoked_at" is null;`);

    this.addSql(`alter table "mentor_invitations" add constraint "mentor_invitations_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on delete set null;`);
    this.addSql(`alter table "mentor_invitations" add constraint "mentor_invitations_accepted_by_id_foreign" foreign key ("accepted_by_id") references "users" ("id") on delete set null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "mentor_invitations" cascade;`);
  }

}
