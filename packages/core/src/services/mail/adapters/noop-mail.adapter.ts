import { randomUUID } from "node:crypto";
import type { Logger } from "../../../logger";
import type { MailGateway, MailMessage } from "../mail.port";

/** Produkcja bez prawdziwego dostawcy: loguje, że wiadomość powstała, i niczego nie wysyła. */
export class NoopMailAdapter implements MailGateway {
  private readonly logger: Logger;

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  async send(message: MailMessage): Promise<void> {
    // Adresat i treść (z tokenami) nigdy nie trafiają do logów.
    this.logger.info({ messageId: randomUUID(), subject: message.subject }, "Wiadomość pominięta — brak dostawcy poczty");
  }
}
