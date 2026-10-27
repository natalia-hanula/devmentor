/** Długość w bajtach UTF-8 — bcrypt bierze pod uwagę tylko pierwsze 72 bajty hasła. */
export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}
