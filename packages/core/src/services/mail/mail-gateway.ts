import type { Env } from "../../config/env";
import type { Logger } from "../../logger";
import { NoopMailAdapter } from "./adapters/noop-mail.adapter";
import { OutboxMailAdapter } from "./adapters/outbox-mail.adapter";
import type { MailGateway } from "./mail.port";

export interface MailAdapters {
  mailGateway: MailGateway;
  /** Ta sama instancja co `mailGateway`, gdy `MAIL_ADAPTER=outbox`; inaczej `null`. */
  mailOutbox: OutboxMailAdapter | null;
}

/** Tworzy adapter poczty wybrany w `MAIL_ADAPTER`. */
export function createMailAdapters({ env, logger }: { env: Pick<Env, "MAIL_ADAPTER">; logger: Logger }): MailAdapters {
  if (env.MAIL_ADAPTER === "outbox") {
    const outbox = new OutboxMailAdapter({ logger });
    return { mailGateway: outbox, mailOutbox: outbox };
  }
  return { mailGateway: new NoopMailAdapter({ logger }), mailOutbox: null };
}

/** Czy wiadomości dochodzą do odbiorcy (lub skrzynki deweloperskiej). `false` dla `noop` — strony ostrzegają wtedy użytkownika. */
export function isMailDeliveryAvailable(env: Pick<Env, "MAIL_ADAPTER">): boolean {
  return env.MAIL_ADAPTER !== "noop";
}
