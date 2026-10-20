import { Migration } from '@mikro-orm/migrations';

export class Migration20261020154408_auth_users_email_lower_unique extends Migration {

  override name = 'Migration20261020154408_auth_users_email_lower_unique';

  override up(): void | Promise<void> {
    this.addSql(`create unique index "users_email_lower_unique" on "users" (lower("email"));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "users_email_lower_unique";`);
  }

}
