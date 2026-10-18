import { Migration } from '@mikro-orm/migrations';

export class Migration20261018080852_init extends Migration {

  override name = 'Migration20261018080852_init';

  override up(): void | Promise<void> {
    this.addSql(`select 1`);
  }

  override down(): void | Promise<void> {
    this.addSql(`select 1`);
  }

}
