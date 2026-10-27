/** Wiadomość e-mail — tylko tekst, bez szablonów HTML. Treść budują serwisy koncepcji. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Port wysyłki poczty. `send` może rzucić; wołający wysyła dopiero po `em.flush()`, żeby wiadomość
 * nie wyszła dla wycofanej transakcji, a błąd wysyłki obsługuje według własnej reguły.
 */
export interface MailGateway {
  send(message: MailMessage): Promise<void>;
}
