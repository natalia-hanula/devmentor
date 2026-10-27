import { randomUUID } from "node:crypto";
import type { Logger } from "../../../logger";
import type { MailGateway, MailMessage } from "../mail.port";

/** Ile ostatnich wiadomości trzyma skrzynka (podgląd operatora pokazuje najwyżej tyle). */
export const OUTBOX_CAPACITY = 100;

export interface OutboxMessage extends MailMessage {
  id: string;
  sentAt: Date;
}

/**
 * Skrzynka deweloperska: zamiast wysyłać, trzyma ostatnie wiadomości w pamięci procesu (giną przy
 * restarcie, Q6). Ujawnia operatorowi linki z treści, więc `parseEnv` dopuszcza ją tylko poza produkcją.
 */
export class OutboxMailAdapter implements MailGateway {
  private readonly logger: Logger;
  private readonly now: () => Date;
  /** Od najstarszej do najnowszej. */
  private readonly messages: OutboxMessage[] = [];

  constructor({ logger, now = () => new Date() }: { logger: Logger; now?: () => Date }) {
    this.logger = logger;
    this.now = now;
  }

  async send(message: MailMessage): Promise<void> {
    const stored: OutboxMessage = {
      id: randomUUID(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      sentAt: this.now(),
    };
    this.messages.push(stored);
    if (this.messages.length > OUTBOX_CAPACITY) {
      this.messages.shift();
    }
    // Adresat i treść (z tokenami) nigdy nie trafiają do logów.
    this.logger.info({ messageId: stored.id, subject: stored.subject }, "Wiadomość zapisana w skrzynce deweloperskiej");
  }

  /** Wiadomości od najnowszej. */
  list(): readonly Readonly<OutboxMessage>[] {
    return [...this.messages].reverse();
  }
}
