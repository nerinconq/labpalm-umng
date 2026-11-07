// codigo.js — el código de etapas que entrega la guía de conexión.
// La MISMA cuenta está en firmware_base/src/Puerta.cpp (Puerta::codigo): si se cambia
// aquí, se cambia allá. Lo comprueba prueba_codigo.mjs.
//
//   FNV-1a de 32 bits sobre "LabPalm-UMNG|<sensor>|<final de la red>", escrito en base
//   23 con un alfabeto sin letras que se confunden (sin O/0, I/1, B/8, S/5, G/6...).
// No es seguridad: el programa es abierto. Es una puerta pedagógica: abrir las etapas
// exige haber pasado por la guía (o por el docente).

export const ALFABETO = "ACDEFHJKMNPRTUVWXY34679";
export const LARGO = 6;
export const SENSORES = ["distancia", "masa", "angulo"];

/**
 * @param {string} sensor  "distancia", "masa" o "angulo"
 * @param {string} final   las 4 letras del final de la red (LabPalm-UMNG-XXXX)
 * @returns {string} el código de 6 caracteres
 */
export function codigoEtapas(sensor, final) {
  const texto = `LabPalm-UMNG|${sensor}|${final.trim().toUpperCase()}`;
  let h = 2166136261;
  for (const byte of new TextEncoder().encode(texto)) {
    h ^= byte;
    h = Math.imul(h, 16777619) >>> 0;
  }
  let c = "";
  for (let i = 0; i < LARGO; i++) {
    c += ALFABETO[h % ALFABETO.length];
    h = Math.floor(h / ALFABETO.length);
  }
  return c;
}

/** El final de la red es hexadecimal (final de la MAC): 4 caracteres 0-9 A-F. */
export const finalValido = (f) => /^[0-9A-F]{4}$/.test(f.trim().toUpperCase());
