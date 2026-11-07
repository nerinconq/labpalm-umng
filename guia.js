// guia.js — recorrido de la guía: elegir sensor → pasos en 3D → código de etapas.
import { SENSORES } from "./montajes.js";
import { codigoEtapas, finalValido } from "./codigo.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
let sensor = null;       // clave en SENSORES
let paso = 0;
let escena = null;       // null si el celular no tiene WebGL o no cargó three.js

function el(tag, clase, texto) {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function mostrarSeccion(id) {
  for (const s of ["inicio", "guia", "final"]) $(s).hidden = s !== id;
  window.scrollTo({ top: 0 });
}

function pintarSensores() {
  for (const [clave, s] of Object.entries(SENSORES)) {
    const b = el("button", "sensor");
    b.append(el("b", "", s.nombre), el("span", "", s.idea));
    if (s.pronto) b.append(el("small", "", "Etapas en preparación: la guía ya sirve para montarlo."));
    b.onclick = () => empezar(clave);
    $("sensores").append(b);
  }
}

// three.js llega por internet: si falla, la guía sigue en texto.
async function prepararEscena() {
  if (escena !== null) return escena;
  try {
    const { Escena } = await import("./escena.js");
    escena = new Escena($("lienzo"));
  } catch (err) {
    escena = false;
    $("sin3d").hidden = false;
    $("lienzo").classList.add("sin3d");
    console.warn("Sin vista 3D:", err);
  }
  return escena;
}

async function empezar(clave) {
  sensor = clave;
  paso = 0;
  mostrarSeccion("guia");
  $("nombreSensor").textContent = SENSORES[clave].nombre;
  history.replaceState(null, "", `?${new URLSearchParams({ ...Object.fromEntries(params), sensor: clave })}`);
  const e = await prepararEscena();
  if (e) e.cargarSensor(SENSORES[clave]);
  pintarPaso();
}

function pintarPaso() {
  const pasos = SENSORES[sensor].pasos;
  const p = pasos[paso];
  $("numeroPaso").textContent = `paso ${paso + 1} de ${pasos.length}`;
  $("puntos").replaceChildren(...pasos.map((_, i) => el("i", i < paso ? "hecho" : i === paso ? "actual" : "")));
  $("tituloPaso").textContent = p.titulo;
  $("notaPaso").textContent = p.nota;
  const revision = $("revision");
  revision.replaceChildren();
  for (const texto of p.revision || []) {
    const etiqueta = el("label");
    const caja = el("input");
    caja.type = "checkbox";
    caja.onchange = revisarListo;
    etiqueta.append(caja, " " + texto);
    revision.append(etiqueta);
  }
  $("atras").disabled = paso === 0;
  $("siguiente").textContent = paso === pasos.length - 1 ? "Ya revisé todo ✓" : "Siguiente →";
  revisarListo();
  if (escena) escena.mostrar(pasos, paso);
}

// En el paso de revisión hay que marcar cada punto antes de seguir.
function revisarListo() {
  const cajas = [...$("revision").querySelectorAll("input")];
  $("siguiente").disabled = cajas.some((c) => !c.checked);
}

function siguiente() {
  if (paso < SENSORES[sensor].pasos.length - 1) { paso++; pintarPaso(); return; }
  mostrarSeccion("final");
  const sinCodigo = !!SENSORES[sensor].sinCodigo;
  $("sinCodigo").hidden = !sinCodigo;
  $("conCodigo").hidden = sinCodigo;
  $("finalRed").value = (params.get("red") || "").toUpperCase().slice(0, 4);
  $("resultado").hidden = true;
}

function verCodigo() {
  const final = $("finalRed").value.trim().toUpperCase();
  if (!finalValido(final)) {
    $("errorRed").textContent = "Son 4 caracteres, números del 0 al 9 y letras de la A a la F (por ejemplo 0DD0).";
    return;
  }
  $("errorRed").textContent = "";
  const codigo = codigoEtapas(sensor, final);
  $("codigo").textContent = codigo;
  $("redCompleta").textContent = `LabPalm-UMNG-${final}`;
  $("abrirTarjeta").href = `http://192.168.4.1/?${new URLSearchParams({ sensor, codigo })}`;
  $("resultado").hidden = false;
}

$("atras").onclick = () => { if (paso > 0) { paso--; pintarPaso(); } };
$("siguiente").onclick = siguiente;
$("otroSensor").onclick = () => mostrarSeccion("inicio");
$("repasar").onclick = () => { mostrarSeccion("guia"); pintarPaso(); };
$("verCodigo").onclick = verCodigo;
$("finalRed").onkeydown = (e) => { if (e.key === "Enter") verCodigo(); };

pintarSensores();
if (SENSORES[params.get("sensor")]) empezar(params.get("sensor"));
