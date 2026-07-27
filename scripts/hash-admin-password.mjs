/**
 * Genera el hash bcrypt de una contraseña de admin para KARUMA_ADMIN_PASSWORD_HASH.
 *
 *   npm run admin:password
 *
 * La contraseña se teclea sin eco y no se guarda en ningún sitio: el script
 * solo imprime el hash (irreversible) listo para pegar en .env.local y Vercel.
 */

import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";

const COSTE = 12;
const MIN_LONGITUD = 10;

const rl = createInterface({ input: stdin, output: stdout, terminal: true });

// El eco se silencia solo mientras se teclea la contraseña: readline escribe el
// prompt cuando se llama a question(), y a partir de ahí se descarta todo (si se
// silenciara antes, el redibujado de readline borraría también el prompt).
let silenciado = false;
rl._writeToOutput = (texto) => {
  if (!silenciado) stdout.write(texto);
};

function preguntaOculta(etiqueta) {
  return new Promise((resolve, reject) => {
    const alCerrar = () => reject(new Error("Entrada cerrada antes de terminar."));
    rl.once("close", alCerrar);
    rl.question(etiqueta, (valor) => {
      rl.removeListener("close", alCerrar);
      silenciado = false;
      stdout.write("\n");
      resolve(valor);
    });
    silenciado = true;
  });
}

function salir(mensaje) {
  console.error(`\n✗ ${mensaje}`);
  rl.close();
  process.exit(1);
}

const password = await preguntaOculta("Nueva contraseña de admin: ");
if (password.length < MIN_LONGITUD) {
  salir(`Demasiado corta: mínimo ${MIN_LONGITUD} caracteres.`);
}

const repetida = await preguntaOculta("Repite la contraseña:      ");
if (password !== repetida) salir("Las dos contraseñas no coinciden.");

const hash = await bcrypt.hash(password, COSTE);
if (!(await bcrypt.compare(password, hash))) {
  salir("El hash generado no verifica (no debería ocurrir).");
}
rl.close();

console.log("\n✓ Hash generado.\n");
console.log("Para .env.local (el $ va escapado, así lo lee Next.js):\n");
console.log(`KARUMA_ADMIN_PASSWORD_HASH=${hash.replaceAll("$", "\\$")}\n`);
console.log("Para Vercel (pegar el valor tal cual, sin escapar):\n");
console.log(`${hash}\n`);
