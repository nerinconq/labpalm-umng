// escena.js — la placa, el sensor y los cables en 3D (three.js). Medidas en mm.
// La placa queda acostada sobre la mesa con el USB hacia quien mira; los pines
// apuntan hacia arriba, como cuando se conectan cables dupont.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PLACA, COLOR } from "./montajes.js";

const PASO_PIN = 2.54;                    // separación entre pines (0,1 pulgada)
const FILA_X = { izquierda: -11.43, derecha: 11.43 };
const SENSOR_X = -48;                     // el sensor, a la izquierda de la placa
const CELDA_X = -125;                     // la celda de carga, más a la izquierda
const ALTO_PIN = 7;
const DURACION_CABLE = 1.1;               // s que tarda en dibujarse un cable

const pinPlaca = (fila, i) => new THREE.Vector3(FILA_X[fila], ALTO_PIN, -26.67 + i * PASO_PIN);

function etiqueta(texto, alto = 2.4, color = "#cfd8e3") {
  const lienzo = document.createElement("canvas");
  const g = lienzo.getContext("2d");
  g.font = "bold 48px system-ui, sans-serif";
  lienzo.width = Math.ceil(g.measureText(texto).width) + 16;
  lienzo.height = 64;
  g.font = "bold 48px system-ui, sans-serif";
  g.fillStyle = color;
  g.textBaseline = "middle";
  g.fillText(texto, 8, 34);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura, depthTest: false, transparent: true }));
  s.scale.set((alto * lienzo.width) / lienzo.height, alto, 1);
  s.renderOrder = 10;
  return s;
}

const caja = (an, al, pr, color, opciones = {}) =>
  new THREE.Mesh(new THREE.BoxGeometry(an, al, pr), new THREE.MeshStandardMaterial({ color, ...opciones }));

function pinMacho() {
  const g = new THREE.Group();
  const base = caja(2.4, 2.5, 2.4, 0x111111);
  base.position.y = 1.25;
  const punta = caja(0.64, ALTO_PIN - 2, 0.64, 0xd4af37, { metalness: 0.8, roughness: 0.3 });
  punta.position.y = 2.5 + (ALTO_PIN - 2.5) / 2;
  g.add(base, punta);
  g.userData.punta = punta;
  return g;
}

export class Escena {
  constructor(contenedor) {
    this.contenedor = contenedor;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    contenedor.append(this.renderer.domElement);
    this.escena = new THREE.Scene();
    this.camara = new THREE.PerspectiveCamera(40, 1, 1, 2000);
    this.camara.position.set(-40, 120, 110);
    this.controles = new OrbitControls(this.camara, this.renderer.domElement);
    this.controles.enableDamping = true;
    this.controles.maxPolarAngle = Math.PI * 0.48;   // no mirar por debajo de la mesa
    this.objetivo = new THREE.Vector3(-30, 0, 0);
    this.distancia = 150;
    this.escena.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.6));
    const sol = new THREE.DirectionalLight(0xffffff, 1.4);
    sol.position.set(60, 120, 80);
    this.escena.add(sol);
    const mesa = new THREE.Mesh(new THREE.PlaneGeometry(1200, 900),
      new THREE.MeshStandardMaterial({ color: 0x10264a, roughness: 0.95 }));
    mesa.rotation.x = -Math.PI / 2;
    mesa.position.set(-40, -1.7, 0);
    this.escena.add(mesa);
    this.pines = {};                       // "izquierda:3" o "sensor:SDA" -> pin
    this.cables = [];
    this.resaltados = [];                  // pines del paso actual, con su aspecto original
    this.reloj = new THREE.Clock();
    this.construirPlaca();
    new ResizeObserver(() => this.ajustar()).observe(contenedor);
    this.ajustar();
    this.renderer.setAnimationLoop(() => this.cuadro());
  }

  ajustar() {
    const { clientWidth: an, clientHeight: al } = this.contenedor;
    this.renderer.setSize(an, al, false);
    this.camara.aspect = an / al;
    this.camara.updateProjectionMatrix();
  }

  construirPlaca() {
    const placa = new THREE.Group();
    const pcb = caja(28, 1.6, 63, 0x1b1b1f);
    pcb.position.y = -0.8;
    const modulo = caja(18, 3.2, 25.5, 0xb8bcc4, { metalness: 0.7, roughness: 0.35 });
    modulo.position.set(0, 1.6, -15);
    const usbA = caja(9, 3.2, 7.5, 0xc0c0c0, { metalness: 0.8 });
    usbA.position.set(-6.5, 1.6, 28.5);
    const usbB = usbA.clone();
    usbB.position.x = 6.5;
    const led = caja(1.6, 1, 1.6, 0xffffff, { emissive: 0x2050ff, emissiveIntensity: 1.2 });
    led.position.set(5, 0.5, 18);
    this.led = led;
    const nombre = etiqueta("ESP32-S3", 3.2, "#1b1b1f");
    nombre.position.set(0, 3.4, -15);
    placa.add(pcb, modulo, usbA, usbB, led, nombre);
    for (const fila of ["izquierda", "derecha"]) {
      PLACA[fila].forEach((texto, i) => {
        const pin = pinMacho();
        const p = pinPlaca(fila, i);
        pin.position.set(p.x, 0, p.z);
        const rotulo = etiqueta(texto, 1.7);
        rotulo.position.set(p.x + (fila === "izquierda" ? 3.2 : -3.2), 0.3, p.z);
        placa.add(pin, rotulo);
        this.pines[`${fila}:${i}`] = { pin, rotulo, texto, punta: p };
      });
    }
    this.escena.add(placa);
  }

  // Módulo del sensor: placa de color con su fila de pines mirando hacia la tarjeta.
  cargarSensor(def) {
    if (this.sensor) this.escena.remove(this.sensor);
    for (const k of Object.keys(this.pines)) if (k.startsWith("sensor:") || k.startsWith("celda:")) delete this.pines[k];
    const m = def.modulo;
    const g = new THREE.Group();
    const pcb = caja(m.ancho, 1.6, m.alto, m.color);
    pcb.position.y = -0.8;
    const chip = caja(m.chip.ancho, 1.2, m.chip.alto, m.chip.color);
    chip.position.set(-2, 0.6, 0);
    const nombre = etiqueta(m.etiqueta, 2.6, "#ffffff");
    nombre.position.set(-2, 2.5, -m.alto / 2 + 2.5);
    g.add(pcb, chip, nombre);
    const fila = (lista, x, prefijo, lado) => lista.forEach((texto, i) => {
      const pin = pinMacho();
      const z = (i - (lista.length - 1) / 2) * PASO_PIN;
      pin.position.set(x, 0, z);
      const rotulo = etiqueta(texto, 1.8);
      rotulo.position.set(x + lado * 3.4, 0.3, z);
      g.add(pin, rotulo);
      this.pines[`${prefijo}:${texto}`] = { pin, rotulo, texto, punta: new THREE.Vector3(SENSOR_X + x, ALTO_PIN, z) };
    });
    fila(m.pines, m.ancho / 2 - 1.8, "sensor", -1);
    if (m.celda) fila(m.celda, -m.ancho / 2 + 1.8, "celda", 1);
    if (m.iman) {
      const iman = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 2.5, 32),
        new THREE.MeshStandardMaterial({ color: 0x9e9e9e, metalness: 0.9, roughness: 0.25 }));
      iman.position.set(-2, 4, 0);
      g.add(iman);
    }
    g.position.x = SENSOR_X;
    this.sensor = g;
    this.escena.add(g);
    if (this.celda) this.escena.remove(this.celda);
    this.celda = m.celda ? this.construirCelda() : null;
  }

  // Barra de aluminio con galgas y sus cuatro cables saliendo hacia el NAU7802.
  construirCelda() {
    const g = new THREE.Group();
    const barra = caja(80, 12.7, 12.7, 0xc9ccd1, { metalness: 0.6, roughness: 0.4 });
    barra.position.y = 6.35;
    const galga = caja(10, 0.4, 8, 0xd8a400);
    galga.position.set(0, 12.9, 0);
    const flecha = etiqueta("↓ peso", 3, "#ffd54f");
    flecha.position.set(25, 16, 0);
    g.add(barra, galga, flecha);
    g.position.set(CELDA_X, 0, -30);
    this.escena.add(g);
    return g;
  }

  // Dibuja de cero los cables de los pasos ya hechos y anima el del paso actual.
  mostrar(pasos, actual) {
    for (const c of this.cables) { this.escena.remove(c.malla); c.malla.geometry.dispose(); }
    this.cables = [];
    for (const r of this.resaltados) {
      r.punta.material = r.materialPunta;
      r.rotulo.material = r.materialRotulo;
      r.rotulo.scale.copy(r.escala);
    }
    this.resaltados = [];
    pasos.slice(0, actual + 1).forEach((paso, i) => {
      for (const [a, b, color] of this.tramos(paso)) this.agregarCable(a, b, color, i === actual);
      if (i === actual) for (const k of this.extremos(paso)) this.resaltar(k);
    });
    this.enfocar(pasos[actual]);
  }

  tramos(paso) {
    const t = [];
    if (paso.desde) t.push([`${paso.desde[0]}:${paso.desde[1]}`, `sensor:${paso.hasta}`, COLOR[paso.cable]]);
    for (const [pin, color] of paso.celda || []) t.push([`celda-barra:${pin}`, `celda:${pin}`, COLOR[color]]);
    return t;
  }

  extremos(paso) { return this.tramos(paso).flatMap(([a, b]) => [a, b]).filter((k) => this.pines[k]); }

  puntoDe(clave) {
    if (this.pines[clave]) return this.pines[clave].punta.clone();
    // Los cables de la celda salen del extremo de la barra.
    const orden = ["E+", "E-", "A-", "A+"].indexOf(clave.split(":")[1]);
    return new THREE.Vector3(CELDA_X + 40, 6, -30 + (orden - 1.5) * 2.2);
  }

  agregarCable(a, b, color, animado) {
    const p1 = this.puntoDe(a), p2 = this.puntoDe(b);
    const alto = 12 + p1.distanceTo(p2) * 0.18;
    const curva = new THREE.CatmullRomCurve3([p1, p1.clone().add(new THREE.Vector3(0, 6, 0)),
      p1.clone().lerp(p2, 0.5).setY(alto), p2.clone().add(new THREE.Vector3(0, 6, 0)), p2]);
    const geo = new THREE.TubeGeometry(curva, 80, 0.75, 10, false);
    const malla = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
    const total = geo.index.count;
    if (animado) geo.setDrawRange(0, 0);
    this.escena.add(malla);
    this.cables.push({ malla, total, inicio: this.reloj.getElapsedTime(), animado });
  }

  resaltar(clave) {
    const { pin, rotulo } = this.pines[clave];
    const punta = pin.userData.punta;
    this.resaltados.push({ punta, rotulo, materialPunta: punta.material, materialRotulo: rotulo.material,
      escala: rotulo.scale.clone() });
    punta.material = punta.material.clone();
    punta.material.emissive = new THREE.Color(0xffc400);
    rotulo.material = rotulo.material.clone();
    rotulo.material.color.set(0xffd54f);
    rotulo.scale.multiplyScalar(1.6);
  }

  enfocar(paso) {
    const puntos = this.extremos(paso).map((k) => this.pines[k].punta);
    if (puntos.length) {
      const centro = puntos.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(puntos.length);
      this.objetivo.copy(centro).setY(0);
      this.distancia = 95 + puntos[0].distanceTo(puntos[puntos.length - 1]) * 0.9;
      return;
    }
    const focos = { placa: [[0, 0, 0], 110], sensor: [[SENSOR_X, 0, 0], 60],
      celda: [[CELDA_X, 0, -30], 110], todo: [[-40, 0, -5], 190] };
    const [p, d] = focos[paso.foco] || focos.todo;
    this.objetivo.set(...p);
    this.distancia = d;
  }

  cuadro() {
    const t = this.reloj.getElapsedTime();
    for (const c of this.cables) {
      if (!c.animado) continue;
      const f = Math.min(1, (t - c.inicio) / DURACION_CABLE);
      c.malla.geometry.setDrawRange(0, Math.floor((c.total * f) / 3) * 3);
    }
    for (const r of this.resaltados) r.punta.material.emissiveIntensity = 0.6 + 0.6 * Math.sin(t * 6);
    // La cámara se acerca suave al foco del paso.
    this.controles.target.lerp(this.objetivo, 0.06);
    const dir = this.camara.position.clone().sub(this.controles.target);
    dir.setLength(THREE.MathUtils.lerp(dir.length(), this.distancia, 0.05));
    this.camara.position.copy(this.controles.target).add(dir);
    this.controles.update();
    this.renderer.render(this.escena, this.camara);
  }
}
