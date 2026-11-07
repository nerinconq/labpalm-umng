// montajes.js — qué se conecta con qué, paso a paso, para cada sensor.
// Es el único archivo que hay que tocar para cambiar un cable o agregar un sensor:
// escena.js dibuja lo que diga aquí.

// ESP32-S3 DevKitC-1 (y clones N16R8): dos filas de 22 pines, el USB abajo.
// Pin 1 arriba (lejos del USB). Los nombres son los que trae impresos la placa.
export const PLACA = {
  izquierda: ["3V3", "3V3", "RST", "4", "5", "6", "7", "15", "16", "17", "18", "8", "3", "46",
    "9", "10", "11", "12", "13", "14", "5V", "GND"],
  derecha: ["GND", "TX", "RX", "1", "2", "42", "41", "40", "39", "38", "37", "36", "35", "0",
    "45", "48", "47", "21", "20", "19", "GND", "GND"],
};

// Colores de cable que usa toda la plataforma (y las guías impresas).
export const COLOR = { rojo: 0xe53935, negro: 0x2b2b2b, azul: 0x1e88e5, amarillo: 0xfdd835,
  blanco: 0xf5f5f5, verde: 0x43a047 };

// Un paso conecta un pin de la placa ("izquierda:3") con un pin del sensor, o explica
// algo sin cable. `desde` = [fila, índice] (0 = pin 1). `celda` = [[pin del NAU7802, color], …]
// son los cables de la celda de carga. `nota` es lo que lee el estudiante.
const alimentar = (sensor) => [
  { titulo: "Primero, sin corriente", nota: "Desconecta el cable USB de la tarjeta antes de " +
    "conectar. Conectar con la tarjeta encendida puede dañar el sensor o la placa.", foco: "placa" },
  { titulo: "3V3 → VCC", cable: "rojo", desde: ["izquierda", 0], hasta: "VCC",
    nota: `El cable rojo lleva 3,3 V desde el pin «3V3» de la placa al «VCC» (o VIN) del ${sensor}. ` +
      "Nunca al pin 5V: el sensor trabaja a 3,3 V." },
  { titulo: "GND → GND", cable: "negro", desde: ["izquierda", 21], hasta: "GND",
    nota: "El cable negro une las tierras: el «GND» de la placa con el «GND» del sensor. Sin " +
      "tierra común no hay señal." },
];

const bus = (sda, scl, nombreBus) => [
  { titulo: `GPIO ${PLACA.izquierda[sda]} → SDA`, cable: "azul", desde: ["izquierda", sda], hasta: "SDA",
    nota: `SDA lleva los datos del ${nombreBus}: del pin ${PLACA.izquierda[sda]} de la placa al «SDA» ` +
      "del sensor. Por este cable viajan las lecturas, bit a bit." },
  { titulo: `GPIO ${PLACA.izquierda[scl]} → SCL`, cable: "amarillo", desde: ["izquierda", scl], hasta: "SCL",
    nota: `SCL es el reloj: del pin ${PLACA.izquierda[scl]} al «SCL». La placa marca el ritmo y el ` +
      "sensor responde a ese compás. Si cruzas SDA y SCL, la tarjeta no encuentra el sensor." },
];

const revisar = (extra) => ({
  titulo: "Revisa antes de encender", foco: "todo", revision: [
    "Rojo en 3V3 (no en 5V) y negro en GND.",
    "Azul en SDA y amarillo en SCL, sin cruzarlos.",
    ...extra,
    "Conecta el USB: el LED de la tarjeta se pone azul y aparece la red LabPalm-UMNG-XXXX.",
  ],
  nota: "Mira el montaje completo: gíralo con el dedo y acércalo con dos dedos.",
});

export const SENSORES = {
  distancia: {
    nombre: "Distancia · VI5300",
    idea: "Mide distancias con un pulso de luz infrarroja: cuenta cuánto tarda en ir y volver.",
    modulo: { ancho: 14, alto: 18, color: 0x0b6e4f, pines: ["VCC", "GND", "SDA", "SCL"],
      chip: { ancho: 4.4, alto: 2.4, color: 0x111111 }, etiqueta: "VI5300" },
    pasos: [...alimentar("VI5300"), ...bus(3, 4, "bus 0"),
      { titulo: "Dónde apuntar", foco: "sensor", nota: "La ventanita negra del chip emite y recibe " +
        "la luz: debe mirar al objeto, sin nada delante. En caída libre, apunta hacia arriba, al objeto que cae." },
      revisar(["La ventanita del VI5300 queda libre, mirando al objeto."])],
  },
  masa: {
    nombre: "Masa · NAU7802",
    idea: "Pesa con una celda de carga: una barra que se dobla muy poco; el NAU7802 mide ese doblez.",
    modulo: { ancho: 20, alto: 24, color: 0x6a1b9a, pines: ["VCC", "GND", "SDA", "SCL"],
      celda: ["E+", "E-", "A-", "A+"], chip: { ancho: 5, alto: 5, color: 0x111111 }, etiqueta: "NAU7802" },
    pasos: [...alimentar("NAU7802"), ...bus(3, 4, "bus 0"),
      { titulo: "Celda: E+ y E−", celda: [["E+", "rojo"], ["E-", "negro"]],
        nota: "La celda de carga tiene 4 cables. Rojo a E+ y negro a E−: alimentan las galgas " +
          "(los resistores que se estiran cuando la barra se dobla)." },
      { titulo: "Celda: A− y A+", celda: [["A-", "blanco"], ["A+", "verde"]],
        nota: "Blanco a A− y verde a A+: por ahí sale la señal, de microvoltios. El NAU7802 la " +
          "amplifica 128 veces. Si la masa sale negativa al poner peso, intercambia blanco y verde." },
      { titulo: "La flecha de la celda", foco: "celda", nota: "La barra tiene una flecha: apunta hacia " +
        "abajo, en el sentido en que se dobla con el peso. Fija un extremo a la base y pon el plato en el otro." },
      revisar(["Cuatro cables de la celda en E+ (rojo), E− (negro), A− (blanco) y A+ (verde).",
        "Luego, en la etapa 1, calibra: tara, masa conocida y verificación."])],
  },
  angulo: {
    nombre: "Ángulo · AS5600",
    idea: "Mide el ángulo de un imán que gira sobre el chip (efecto Hall).",
    pronto: true,
    modulo: { ancho: 23, alto: 23, color: 0x1565c0, pines: ["VCC", "GND", "DIR", "SCL", "SDA"],
      chip: { ancho: 5, alto: 5, color: 0x111111 }, iman: true, etiqueta: "AS5600" },
    pasos: [...alimentar("AS5600"), ...bus(15, 16, "bus 1 (pines 10 y 11)"),
      { titulo: "DIR → GND", cable: "negro", desde: ["derecha", 0], hasta: "DIR",
        nota: "DIR elige el sentido de giro positivo. Conéctalo a GND para que no quede «al aire» " +
          "y el ángulo no salte." },
      { titulo: "El imán", foco: "sensor", nota: "El imán va centrado sobre el chip, a 1–2 mm, y " +
        "gira con la polea. Si está lejos o descentrado, la lectura salta." },
      revisar(["DIR en GND.", "El imán centrado sobre el chip, a 1–2 mm."])],
  },
};
