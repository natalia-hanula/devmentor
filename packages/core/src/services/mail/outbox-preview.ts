import { NotFoundError } from "../../http/errors";
import type { OutboxMailAdapter } from "./adapters/outbox-mail.adapter";

/** Wiadomość w podglądzie skrzynki — jawna lista pól, data jako ISO. */
export interface OutboxMessageDto {
  id: string;
  to: string;
  subject: string;
  text: string;
  sentAt: string;
}

/**
 * Wiadomości skrzynki deweloperskiej od najnowszej (najwyżej `OUTBOX_CAPACITY`). Przy adapterze innym
 * niż `outbox` (`mailOutbox` = `null`) — 404: skrzynki nie ma. Dostęp (rola operatora) sprawdza trasa wcześniej.
 */
export function listOutboxMessages(mailOutbox: OutboxMailAdapter | null): OutboxMessageDto[] {
  if (!mailOutbox) {
    throw new NotFoundError("Skrzynka deweloperska jest wyłączona");
  }
  return mailOutbox.list().map(({ id, to, subject, text, sentAt }) => ({
    id,
    to,
    subject,
    text,
    sentAt: sentAt.toISOString(),
  }));
}
