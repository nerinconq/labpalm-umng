// Prueba: el código de la guía (codigo.js) es el mismo que calcula la tarjeta (Puerta.cpp).
// Los valores esperados los dio la tarjeta LabPalm-UMNG-0DD0 con el comando serie CODIGOS
// (6-nov-2026). Uso:  node prueba_codigo.mjs
import assert from "node:assert/strict";
import { ALFABETO, codigoEtapas, finalValido } from "./codigo.js";

const DE_LA_TARJETA = { distancia: "37VUNW", masa: "RWJTFT", angulo: "YN77MX" };
for (const [sensor, esperado] of Object.entries(DE_LA_TARJETA)) {
  assert.equal(codigoEtapas(sensor, "0DD0"), esperado, sensor);
  assert.equal(codigoEtapas(sensor, " 0dd0 "), esperado, `${sensor} en minúsculas`);
}
// Otra tarjeta y otro sensor dan otro código.
assert.notEqual(codigoEtapas("masa", "26F8"), DE_LA_TARJETA.masa);
assert.notEqual(codigoEtapas("distancia", "0DD0"), codigoEtapas("masa", "0DD0"));
// Solo letras del alfabeto sin confusiones, siempre 6.
for (const f of ["0000", "FFFF", "26F8", "A1B2"]) assert.match(codigoEtapas("masa", f), new RegExp(`^[${ALFABETO}]{6}$`));
assert.ok(finalValido("0dd0") && !finalValido("0DG0") && !finalValido("0DD"));
console.log("OK: la guía y la tarjeta calculan el mismo código.");
