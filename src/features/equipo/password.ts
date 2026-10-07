import "server-only";
import { randomInt } from "node:crypto";

// Sin caracteres ambiguos (0/O, 1/l/I) para que se pueda dictar o copiar sin errores.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Contraseña temporal legible, p. ej. "kx7m-P9q2-t4Wz" (12 caracteres aleatorios, ~68 bits). */
export function generateTempPassword(): string {
  const groups: string[] = [];
  for (let g = 0; g < 3; g++) {
    let chunk = "";
    for (let i = 0; i < 4; i++) chunk += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(chunk);
  }
  return groups.join("-");
}
