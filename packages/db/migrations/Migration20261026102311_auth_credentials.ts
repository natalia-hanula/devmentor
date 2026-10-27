import { Migration } from '@mikro-orm/migrations';

export class Migration20261026102311_auth_credentials extends Migration {

  override name = 'Migration20261026102311_auth_credentials';

  override up(): void | Promise<void> {
    this.addSql(`create table "user_tokens" ("id" uuid not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "user_id" uuid not null, "purpose" text not null, "token_hash" char(64) not null, "expires_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "user_tokens" add constraint "user_tokens_token_hash_unique" unique ("token_hash");`);
    this.addSql(`alter table "user_tokens" add constraint "user_tokens_user_id_purpose_unique" unique ("user_id", "purpose");`);

    this.addSql(`alter table "users" add "password_hash" varchar(60) null;`);

    this.addSql(`alter table "user_tokens" add constraint "user_tokens_user_id_foreign" foreign key ("user_id") references "users" ("id") on delete cascade;`);
    this.addSql(`alter table "user_tokens" add constraint "user_tokens_purpose_check" check ("purpose" in ('email_verification', 'password_reset'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "user_tokens" cascade;`);

    this.addSql(`alter table "users" drop column "password_hash";`);
  }

}
